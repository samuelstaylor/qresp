import DocsLayout from "../../../components/Docs/DocsLayout";
import {
  Bullets,
  Callout,
  Code,
  CodeBlock,
  DocLink,
  ExternalLink,
  P,
  PageTitle,
  Section,
} from "../../../components/Docs/elements";

const REPOSITORY = "https://github.com/qresp-code-development/qresp";

const CONFIG_INI = `
[GLOBAL]
MAIL_ADDR = x@y.com
SMTP_SERVER = smtp.gmail.com
SMTP_PORT = 587

[PROD]
MONGODB_HOST = db.y.com
MONGODB_PORT = 27017
MONGODB_USERNAME = username
MONGODB_PASSWORD = password
MONGODB_DB_NAME = index_name

[SECRETS]
MAIL_PWD = Password for the MAIL_ADDR (specified above) in the SMTP server
`;

const QrespInstallation = () => (
  <DocsLayout
    href="/documentation/installation/qresp"
    title="Qresp Installation"
    description="Install the Qresp Curator and Explorer using Docker Compose, and configure mail and MongoDB."
  >
    <PageTitle eyebrow="Installation" title="Qresp Installation">
      Qresp is a software with a GUI which guides the user in creating metadata
      from the data associated to a scientific paper (
      <DocLink href="/documentation/tutorial/data-organization">step 1</DocLink>
      ). It can then be used to search curated papers, view charts, notebooks,
      workflows on a per publication basis and download the data associated to
      a scientific paper.
    </PageTitle>

    <P>
      The metadata gathered during this curation step includes data location,
      publication details and user-defined attributes. The metadata is
      generated using the JSON (JavaScript Object Notation) syntax and the
      metadata file is sent to a document-oriented database. The current
      implementation uses{" "}
      <ExternalLink href="https://www.mongodb.com/docs/manual/administration/install-on-linux/">
        MongoDB
      </ExternalLink>
      , which is an open source software.
    </P>

    <Section title="Installation using Docker">
      <P>
        Clone the Qresp source from the{" "}
        <ExternalLink href={REPOSITORY}>Qresp GitHub repository</ExternalLink>{" "}
        and use{" "}
        <ExternalLink href="https://docs.docker.com/compose/">Docker Compose</ExternalLink>:
      </P>
      <CodeBlock label="shell">{`
git clone https://github.com/qresp-code-development/qresp.git
cd qresp
git checkout master
docker-compose up -d --build
`}</CodeBlock>
    </Section>

    <Section title="Configuration">
      <P>
        Please make sure you edit all the variables in{" "}
        <ExternalLink href={`${REPOSITORY}/blob/develop/backend/project/config.ini`}>
          <Code>config.ini</Code>
        </ExternalLink>{" "}
        to utilize all the capabilities of Qresp. If not, you&rsquo;ll still be
        able to use the explorer section but the curator sections wouldn&rsquo;t
        work as intended.
      </P>
      <P>See the list of required variables below (with examples).</P>
      <CodeBlock label="config.ini">{CONFIG_INI}</CodeBlock>

      <Callout kind="warning">
        If you don&rsquo;t have the correct SSL certificates, you&rsquo;ll need
        to remove (or comment out) a few lines, otherwise you&rsquo;ll run into
        build issues. Specifically:
        <Bullets
          dense
          items={[
            <span key="d">
              <ExternalLink href={`${REPOSITORY}/blob/develop/nginx/Dockerfile#L13`}>
                Lines 13 &amp; 14
              </ExternalLink>
              , in the Dockerfile
            </span>,
            <span key="n">
              <ExternalLink href={`${REPOSITORY}/blob/develop/nginx/default.conf#L43`}>
                Lines 43 &amp; 44
              </ExternalLink>
              , in the nginx (reverse proxy) configuration
            </span>,
          ]}
        />
        Delete the above mentioned lines or add a <Code>#</Code> at the start
        of each line.
      </Callout>

      <P>
        We recommend setting up the MongoDB instance outside of the Docker
        services, but you can use <Code>docker-compose.yml</Code> services to
        run both MongoDB and nginx containers.
      </P>
    </Section>

    <Section title="Accessing the portal">
      <P>
        Once the installation is completed, please use your browser to access
        the Qresp portal using the port number used in <Code>docker run</Code>,
        for example <Code>http://localhost:8080</Code>.
      </P>
      <Callout kind="note">
        Once the installation is completed, please use your browser to access
        the Qresp portal using the address reported in the output.
      </Callout>
    </Section>
  </DocsLayout>
);

export default QrespInstallation;
