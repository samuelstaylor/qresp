import json
import os
import unittest
from unittest import mock

from project import curation_ai as cai
from project.tests.test_curation import FOLDER, CurationTestBase

GEMINI_ENV = {
    "QRESP_GEMINI_ENABLED": "1",
    "QRESP_GEMINI_API_KEY": "test-gemini-super-secret",
    "QRESP_GEMINI_MODEL": "gemini-test",
}

FIGURES = [
    {"id": "c0", "number": "1", "caption": "High-throughput screening of spin defects in MgO."},
    {"id": "c1", "number": "2", "caption": "Formation energies and defect levels of the NV center."},
    {"id": "c2", "number": "3", "caption": ""},
]


class AiTestBase(CurationTestBase):
    def setUp(self):
        super().setUp()
        for key, value in GEMINI_ENV.items():
            os.environ[key] = value

    def tearDown(self):
        for key in GEMINI_ENV:
            os.environ.pop(key, None)
        super().tearDown()

    def post(self, path, body):
        return self.client.post(path, json=body, headers={"X-CSRF-Token": self.csrf})


class TestFigureKeywords(AiTestBase):
    def test_requires_consent_before_any_provider_call(self):
        self.login()
        with mock.patch("project.assist.call_gemini") as gemini:
            response = self.post("/api/curation/suggest-figure-keywords",
                                 {"consent": False, "figures": FIGURES})
        self.assertEqual(400, response.status_code)
        gemini.assert_not_called()

    def test_off_when_not_configured(self):
        self.login()
        os.environ.pop("QRESP_GEMINI_API_KEY")
        response = self.post("/api/curation/suggest-figure-keywords",
                             {"consent": True, "figures": FIGURES})
        self.assertEqual(503, response.status_code)

    def test_needs_captions(self):
        self.login()
        with mock.patch("project.assist.call_gemini") as gemini:
            response = self.post("/api/curation/suggest-figure-keywords",
                                 {"consent": True, "figures": [FIGURES[2]]})
        self.assertEqual(400, response.status_code)
        gemini.assert_not_called()

    def test_keywords_are_cleaned_and_only_for_known_figures(self):
        self.login()
        answer = json.dumps({
            "paper_keywords": ["spin qubit", "MgO", "data"],
            "figures": [
                {"id": "c0", "keywords": ["high-throughput screening", "spin defects",
                                          "Figure", "screen.png", "spin defects"]},
                {"id": "c1", "keywords": ["formation energy", "defect levels"]},
                {"id": "c9", "keywords": ["invented"]},
            ],
        })
        with mock.patch("project.assist.call_gemini", return_value=(answer, None)) as gemini:
            response = self.post("/api/curation/suggest-figure-keywords", {
                "consent": True,
                "paper": {"title": "An NV center in MgO", "abstract": "We identify...", "keywords": ["DFT"]},
                "figures": FIGURES,
            })
        self.assertEqual(200, response.status_code, response.text)
        body = response.json()
        self.assertEqual(
            {"c0": ["high-throughput screening", "spin defects"],
             "c1": ["formation energy", "defect levels"]},
            {f["id"]: f["keywords"] for f in body["figures"]})
        self.assertEqual(["spin qubit", "MgO"], body["paper_keywords"])
        payload = gemini.call_args[0][1]
        # Only captioned figures, and nothing about the curator, are sent.
        self.assertEqual(["c0", "c1"], [f["id"] for f in payload["figures"]])
        self.assertNotIn("curator", json.dumps(payload))

    def test_provider_rate_limit_is_passed_through(self):
        from project import assist
        self.login()
        error = assist.ProviderError("You have reached the AI usage limit.",
                                     assist.ERROR_RATE_LIMITED)
        with mock.patch("project.assist.call_gemini", return_value=(None, error)):
            response = self.post("/api/curation/suggest-figure-keywords",
                                 {"consent": True, "figures": FIGURES})
        self.assertEqual(429, response.status_code)
        self.assertEqual("You have reached the AI usage limit.", response.json()["error"])

    def test_unusable_answer_is_a_502(self):
        self.login()
        with mock.patch("project.assist.call_gemini", return_value=("not json", None)):
            response = self.post("/api/curation/suggest-figure-keywords",
                                 {"consent": True, "figures": FIGURES})
        self.assertEqual(502, response.status_code)


SCRIPT_TEXT = '''"""Plot the configuration coordinate diagram."""
import numpy as np
import matplotlib.pyplot as plt
API_KEY = "abcdefghijklmnopqrstuvwxyz123456"
gs = np.loadtxt('./singlet_ccd_qeff')
plt.plot(gs[:, 0], gs[:, 1])
plt.xlabel("Q (amu^1/2 A)")
plt.savefig('ccd.pdf')
'''


class TestSuggestLinks(AiTestBase):
    def body(self, **extra):
        body = {
            "consent": True,
            "path": FOLDER,
            "paper": {"title": "An NV center in MgO"},
            "figures": FIGURES[:2],
            "scripts": [{"id": "s0", "files": ["/Scripts/ccd_qeff.py"]}],
            "datasets": [{"id": "d0", "name": "Figure_2_data", "files": ["Data/Figure_2_data/energies.dat"]}],
            "existing_links": [{"from": "d0", "to": "c1"}],
        }
        body.update(extra)
        return body

    def test_reads_scripts_and_returns_only_valid_new_links(self):
        self.login()
        answer = json.dumps({"links": [
            {"from": "s0", "to": "c1", "reason": "Plots defect levels.", "confidence": "medium"},
            {"from": "d0", "to": "c1", "reason": "Already linked.", "confidence": "high"},
            {"from": "c0", "to": "s0", "reason": "Wrong direction.", "confidence": "high"},
            {"from": "s7", "to": "c0", "reason": "Unknown script.", "confidence": "high"},
            {"from": "d0", "to": "s0", "reason": "Reads its data.", "confidence": "bogus"},
            {"from": "d0", "to": "c0", "reason": "Same system.", "confidence": "High"},
        ]})
        with mock.patch("project.curation_ai._fetch_text_sized",
                        return_value=(SCRIPT_TEXT, False)) as fetch, \
                mock.patch("project.assist.call_gemini", return_value=(answer, None)) as gemini:
            response = self.post("/api/curation/suggest-links", self.body())
        self.assertEqual(200, response.status_code, response.text)
        self.assertEqual(
            [("s0", "c1", "generates", "medium"), ("d0", "s0", "consumes", "low"),
             ("d0", "c0", "consumes", "high")],
            [(l["from"], l["to"], l["type"], l["confidence"]) for l in response.json()["links"]])
        fetch.assert_called_once_with(FOLDER + "/Scripts/ccd_qeff.py")
        sent = json.dumps(gemini.call_args[0][1])
        self.assertIn("savefig", sent)
        self.assertNotIn("abcdefghijklmnopqrstuvwxyz123456", sent)

    def test_requires_consent(self):
        self.login()
        with mock.patch("project.assist.call_gemini") as gemini:
            response = self.post("/api/curation/suggest-links", self.body(consent=False))
        self.assertEqual(400, response.status_code)
        gemini.assert_not_called()

    def test_folder_outside_allowed_roots_is_refused(self):
        self.login()
        with mock.patch("project.assist.call_gemini") as gemini:
            response = self.post("/api/curation/suggest-links",
                                 self.body(path="https://evil.example/files/x"))
        self.assertEqual(400, response.status_code)
        gemini.assert_not_called()


class TestSchemas(unittest.TestCase):
    def test_only_schema_features_gemini_accepts(self):
        # Gemini's responseSchema rejects a bare "enum" (HTTP 400); the
        # working keyword schema uses only these keys.
        allowed = {"type", "properties", "items", "required", "maxItems", "maxLength"}

        def walk(node):
            if isinstance(node, dict):
                keys = set(node) - {"properties"}
                self.assertTrue(keys <= allowed | {"properties"}, keys - allowed)
                for key, value in node.items():
                    if key == "properties":
                        for child in value.values():
                            walk(child)
                    elif isinstance(value, (dict, list)):
                        walk(value)
            elif isinstance(node, list):
                for item in node:
                    walk(item)

        walk(cai.LINK_SCHEMA)
        walk(cai.FIGURE_KEYWORD_SCHEMA)


class TestScriptExcerpt(unittest.TestCase):
    def test_keeps_what_the_script_reads_writes_and_plots(self):
        text = "\n".join(["# header"] + ["x = %d" % i for i in range(60)] +
                         ["data = np.loadtxt('a.dat')", "plt.savefig('fig2.pdf')"])
        excerpt = cai.script_excerpt(text)
        self.assertIn("# header", excerpt)
        self.assertIn("loadtxt('a.dat')", excerpt)
        self.assertIn("savefig('fig2.pdf')", excerpt)
        self.assertNotIn("x = 59", excerpt)
