from os import getcwd, listdir, makedirs
from sys import stderr
import json
import traceback
from uuid import uuid4

from project.utils.mail import mailClient
from project.utils.validate import Validate
from project.paperdao import PaperDAO
from project.config import Config


# Written into a queue file once its link has been verified, so the same link
# resolves to the same record however many times it is clicked.
PUBLISHED_ID_KEY = '_published_id'


def _truthy(value):
    return str(value or '').strip().lower() in ('1', 'true', 'yes', 'on')


class Publish:
    """
    Controller for Publishing Papers to the MongoDB database
    See docs/curation/publishing.md for how publishing works
    """

    def __init__(self):
        self.dir_prefix = getcwd() + '/papers/publish/'
        self.id_prefix = 'PUBLISH_'
        # Pending verification records are runtime state, not source files.
        # Make the directory on demand because Git does not retain it empty.
        makedirs(self.dir_prefix, exist_ok=True)

    def generateId(self):
        '''
        Generate a new tmp id for the paper to be published
        '''
        id = uuid4().hex
        while("{}{}.json".format(self.id_prefix, id) in listdir(self.dir_prefix)):
            id = uuid4().hex

        return "{}{}".format(self.id_prefix, id)

    def verify(self, id):
        '''
        Verify the user's and return the id of the new published paper

        Parameters
        -----------
        id: string
            The id associated to the metadata

        Return
        ------
        id, string, if no error
        html error code, if error
        '''
        try:
            path = "{}{}.json".format(self.dir_prefix, id)
            with open(path, 'r') as f:
                paper = json.load(f)
            dao = PaperDAO()
            # Idempotent per LINK, not per paper: a second click on the same
            # verification link lands on the record that link created. The
            # paper's title or DOI is never the key -- another curator's
            # record of the same paper is a separate record, not this one.
            published_id = paper.pop(PUBLISHED_ID_KEY, None)
            if published_id and dao.paperExists(published_id):
                return published_id
            new_id = dao.insertIntoPapers(paper)
            paper[PUBLISHED_ID_KEY] = new_id
            with open(path, 'w') as f:
                json.dump(paper, f, ensure_ascii=False)
            return new_id
        except FileNotFoundError as e:
            print(e, file=stderr)
            return {"msg": "This verification link is invalid or has already been used. If you just published, your paper may already be in the database.", "code": 404}
        except Exception as e:
            print(e, file=stderr)
            return {"msg": "Internal Server Error", "code": 500}

    def publish(self, paper, server):
        '''
        Generate a new link to verify the identity of the user and then publish

        Parameters
        -----------
        paper: dict
               The metadata to be published

        Return
        ------
        200, if no errors
        msg and html error code, if error
        '''

        try:
            with open(getcwd()+"/project/schema.json") as f:
                schema = json.load(f)
                errors = Validate.validatepaper(paper, schema)
                if errors != True:
                    return {'msg': errors, 'code': 400}
        except FileNotFoundError as e:
            print(e, file=stderr)
            return {'msg': 'Schema not found, Internal Server Error', 'code': 500}

        curatorDetails = paper['info']['insertedBy']

        name = "{} {} {}".format(curatorDetails['firstName'],
                                 curatorDetails['middleName'],
                                 curatorDetails['lastName'])
        name = name.replace("  ", " ")

        id = self.generateId()

        subject = 'Qresp Publish Verification'

        server = (server or '').strip().rstrip('/')

        if server.startswith('http://'):
            server = server.replace('http://', 'https://', 1)

        server = server.replace('http://', 'https://')
        verifyLinkUrl = "{0}/verify/{1}?server={0}".format(server, id)
        html = '''
        <html>
            <body>
                <p>
                    Hello {0},<br>
                    Thank you, for publishing on Qresp. Here is the link to publish the paper below.<br>
                    Click on the link below or paste it in the browser <br>
                    <br>
                    <a href={1}>{1}</a><br><br>
                    Have a great day !<br>
                    The Qresp Team
                </p>
            </body>
        </html>
        '''.format(name, verifyLinkUrl)

        try:
            with open("{}{}.json".format(self.dir_prefix, id), 'w') as f:
                json.dump(paper, f, ensure_ascii=False)
        except Exception as e:
            traceback.print_exc(file=stderr)
            return {
                "msg": "Could not queue the paper for verification: %s" % e,
                "code": 500,
            }

        if _truthy(Config.get_setting('PUBLISH', 'PUBLISH_SKIP_EMAIL')):
            return {
                "id": id,
                "verify_link": verifyLinkUrl,
                "email_sent": False,
            }

        try:
            mailClient.send(subject, "", html, curatorDetails['emailId'])
            return 200
        except Exception:
            # Full cause goes to the server log only; the client gets a
            # stable, secret-free message.
            traceback.print_exc(file=stderr)
            return {
                "msg": "Verification email could not be sent. Check SMTP configuration.",
                "code": 500,
            }
