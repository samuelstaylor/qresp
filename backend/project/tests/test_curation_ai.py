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
        self.assertEqual(["gemini-test"], body["models"])
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


class TestBusyProviderRetry(unittest.TestCase):
    CFG = {"API_KEY": "k", "MODEL": "m", "TIMEOUT": 5, "MAX_OUTPUT_TOKENS": 256}

    def response(self, status, body=None):
        r = mock.Mock()
        r.status_code = status
        r.json.return_value = body if body is not None else {}
        return r

    def ok(self):
        return self.response(200, {"candidates": [{
            "content": {"parts": [{"text": '{"links": []}'}]},
            "finishReason": "STOP"}]})

    def test_a_busy_503_is_retried_then_succeeds(self):
        from project import assist
        with mock.patch.object(assist.requests, "post",
                               side_effect=[self.response(503), self.ok()]) as post, \
                mock.patch.object(assist.time, "sleep") as sleep:
            answer, error = assist.call_gemini(self.CFG, {}, "p", {})
        self.assertIsNone(error)
        self.assertEqual('{"links": []}', answer)
        self.assertEqual(2, post.call_count)
        sleep.assert_called_once()

    def test_other_errors_are_never_retried(self):
        from project import assist
        with mock.patch.object(assist.requests, "post",
                               return_value=self.response(400)) as post, \
                mock.patch.object(assist.time, "sleep"):
            _answer, error = assist.call_gemini(self.CFG, {}, "p", {})
        self.assertEqual(1, post.call_count)
        self.assertEqual(assist.ERROR_OTHER, assist.error_kind(error))

    def rate_limited(self, quota, delay=None):
        details = [{"@type": "type.googleapis.com/google.rpc.QuotaFailure",
                    "violations": [{"quotaId": quota}]}]
        if delay:
            details.append({"@type": "type.googleapis.com/google.rpc.RetryInfo",
                            "retryDelay": delay})
        return self.response(429, {"error": {"code": 429, "message": "secret prompt echo",
                                             "details": details}})

    def test_a_per_minute_limit_says_how_long_to_wait(self):
        from project import assist
        with mock.patch.object(assist.requests, "post", return_value=self.rate_limited(
                "GenerateRequestsPerMinutePerProjectPerModel-FreeTier", "37.2s")):
            _answer, error = assist.call_gemini(self.CFG, {}, "p", {})
        self.assertEqual(assist.ERROR_RATE_LIMITED, assist.error_kind(error))
        self.assertIn("about 38 seconds", error)
        self.assertNotIn("secret prompt echo", error)

    def test_a_per_day_limit_says_try_tomorrow(self):
        from project import assist
        with mock.patch.object(assist.requests, "post", return_value=self.rate_limited(
                "GenerateRequestsPerDayPerProjectPerModel-FreeTier")):
            _answer, error = assist.call_gemini(self.CFG, {}, "p", {})
        self.assertIn("daily usage limit", error)
        self.assertIn("tomorrow", error)

    def test_gives_up_after_the_retries(self):
        from project import assist
        with mock.patch.object(assist.requests, "post",
                               return_value=self.response(503)) as post, \
                mock.patch.object(assist.time, "sleep"):
            _answer, error = assist.call_gemini(self.CFG, {}, "p", {})
        self.assertEqual(1 + len(assist.UNAVAILABLE_RETRY_DELAYS), post.call_count)
        self.assertEqual(assist.ERROR_UNAVAILABLE, assist.error_kind(error))


class TestPartialKeywords(AiTestBase):
    def test_a_failed_batch_marks_the_answer_incomplete(self):
        from project import assist
        self.login()
        figures = [{"id": "c%d" % i, "number": str(i), "caption": "Caption %d" % i}
                   for i in range(25)]
        good = json.dumps({"figures": [{"id": "c0", "keywords": ["spin defects"]}]})
        busy = assist.ProviderError("busy", assist.ERROR_UNAVAILABLE)
        with mock.patch("project.assist.call_gemini",
                        side_effect=[(good, None), (None, busy)]):
            response = self.post("/api/curation/suggest-figure-keywords",
                                 {"consent": True, "figures": figures})
        self.assertEqual(200, response.status_code, response.text)
        self.assertTrue(response.json()["incomplete"])


class TestQuotaRefund(AiTestBase):
    def test_a_failed_provider_call_does_not_use_up_the_daily_limit(self):
        from project import assist
        from project.models import AssistUsage
        self.login()
        busy = assist.ProviderError("busy", assist.ERROR_UNAVAILABLE)
        with mock.patch("project.assist.call_gemini", return_value=(None, busy)):
            response = self.post("/api/curation/suggest-figure-keywords",
                                 {"consent": True, "figures": FIGURES})
        self.assertEqual(503, response.status_code)
        usage = AssistUsage.objects(email="curator@example.com").first()
        self.assertEqual(0, usage.count if usage else 0)

    def test_a_successful_call_is_counted(self):
        from project.models import AssistUsage
        self.login()
        answer = json.dumps({"figures": [{"id": "c0", "keywords": ["spin defects"]}]})
        with mock.patch("project.assist.call_gemini", return_value=(answer, None)):
            self.post("/api/curation/suggest-figure-keywords",
                      {"consent": True, "figures": FIGURES})
        self.assertEqual(1, AssistUsage.objects(email="curator@example.com").first().count)


class TestModelFallback(unittest.TestCase):
    def setUp(self):
        from project import assist
        self.assist = assist
        assist._EXHAUSTED.clear()
        self.cfg = {"API_KEY": "k", "MODEL": "primary", "TIMEOUT": 5,
                    "MAX_OUTPUT_TOKENS": 256, "MODELS": ["primary", "backup"]}

    def tearDown(self):
        self.assist._EXHAUSTED.clear()

    def daily(self):
        error = self.assist.ProviderError("daily", self.assist.ERROR_RATE_LIMITED)
        error.daily = True
        return None, error

    def test_falls_back_when_the_daily_quota_runs_out_and_remembers_it(self):
        calls = []

        def fake(cfg, *args, **kwargs):
            calls.append(cfg["MODEL"])
            return self.daily() if cfg["MODEL"] == "primary" else ("ok", None)

        with mock.patch.object(self.assist, "_call_model", side_effect=fake):
            self.assertEqual(("ok", None), self.assist.call_gemini(self.cfg, {}, "p", {}))
            self.assertEqual(("ok", None), self.assist.call_gemini(self.cfg, {}, "p", {}))
        # The exhausted model is skipped for the rest of the day.
        self.assertEqual(["primary", "backup", "backup"], calls)

    def test_other_failures_do_not_switch_models(self):
        bad = (None, self.assist.ProviderError("bad", self.assist.ERROR_OTHER))
        with mock.patch.object(self.assist, "_call_model", return_value=bad) as call:
            _answer, error = self.assist.call_gemini(self.cfg, {}, "p", {})
        self.assertEqual(1, call.call_count)
        self.assertEqual("bad", error)

    def test_every_model_exhausted_reports_the_daily_limit(self):
        with mock.patch.object(self.assist, "_call_model", side_effect=lambda *a, **k: self.daily()):
            self.assist.call_gemini(self.cfg, {}, "p", {})
        with mock.patch.object(self.assist, "_call_model") as call:
            _answer, error = self.assist.call_gemini(self.cfg, {}, "p", {})
        call.assert_not_called()
        self.assertIn("daily usage limit", error)

    def test_chain_comes_from_the_environment(self):
        with mock.patch.dict(os.environ, {
                "QRESP_GEMINI_MODEL": "m1",
                "QRESP_GEMINI_FALLBACK_MODELS": " m2, m1 ,bad/name, m3 "}):
            self.assertEqual(["m1", "m2", "m3"], self.assist._gemini_config()["MODELS"])


class TestThinkingLevelFallback(unittest.TestCase):
    CFG = {"API_KEY": "k", "MODEL": "gemini-new", "TIMEOUT": 5, "MAX_OUTPUT_TOKENS": 256}

    def setUp(self):
        from project import assist
        self.assist = assist
        assist._THINKING_LEVEL.clear()

    def tearDown(self):
        self.assist._THINKING_LEVEL.clear()

    def response(self, status, body):
        r = mock.Mock()
        r.status_code = status
        r.json.return_value = body
        return r

    def ok(self):
        return self.response(200, {"candidates": [{
            "content": {"parts": [{"text": '{"a": "ok"}'}]}, "finishReason": "STOP"}]})

    def refused(self):
        return self.response(400, {"error": {"status": "INVALID_ARGUMENT", "message":
            "Thinking level MINIMAL is not supported for this model."}})

    def levels(self, post):
        return [call.kwargs["json"]["generationConfig"].get("thinkingConfig", {}).get("thinkingLevel")
                for call in post.call_args_list]

    def test_a_refused_level_is_retried_with_the_next_and_remembered(self):
        with mock.patch.object(self.assist.requests, "post",
                               side_effect=[self.refused(), self.ok(), self.ok()]) as post:
            first = self.assist._call_model(self.CFG, {}, "p", {})
            second = self.assist._call_model(self.CFG, {}, "p", {})
        self.assertEqual(('{"a": "ok"}', None), first)
        self.assertEqual(('{"a": "ok"}', None), second)
        self.assertEqual(["minimal", "low", "low"], self.levels(post))

    def test_an_unrelated_400_is_not_retried(self):
        bad = self.response(400, {"error": {"status": "INVALID_ARGUMENT", "message": "Bad schema."}})
        with mock.patch.object(self.assist.requests, "post", return_value=bad) as post:
            _answer, error = self.assist._call_model(self.CFG, {}, "p", {})
        self.assertEqual(1, post.call_count)
        self.assertEqual(self.assist.ERROR_OTHER, self.assist.error_kind(error))
