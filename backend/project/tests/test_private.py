from project.paperdao import Paper
from project.tests.test_permissions import (
    ADMIN,
    OTHER,
    OWNER,
    PermissionTestBase,
)

VIEWER = "viewer@example.com"
EDITOR = "editor@example.com"


class PrivateTestBase(PermissionTestBase):
    def set_visibility(self, paper_id, body):
        return self.client.put(
            f"/api/paper/{paper_id}/visibility", json=body,
            headers={"X-CSRF-Token": self.csrf},
        )

    def set_viewers(self, paper_id, viewers):
        return self.client.put(
            f"/api/paper/{paper_id}/viewers",
            json={"viewer_emails": viewers},
            headers={"X-CSRF-Token": self.csrf},
        )

    def make_private_as_owner(self, viewers=(VIEWER,)):
        self.login(OWNER)
        response = self.set_visibility(
            self.owned_id,
            {"is_private": True, "viewer_emails": list(viewers)})
        assert response.status_code == 200, response.text

    def logout(self):
        self.client.post("/api/auth/logout",
                         headers={"X-CSRF-Token": self.csrf})

    def search_ids(self):
        response = self.client.get("/api/search")
        assert response.status_code == 200, response.text
        return {item["_Search__id"] for item in response.json()}


class TestVisibilityManagement(PrivateTestBase):
    """PUT /api/paper/{id}/visibility and /viewers — owner/admin only."""

    def test_owner_can_make_private_and_share(self):
        self.login(OWNER)
        response = self.set_visibility(
            self.owned_id,
            {"is_private": True, "viewer_emails": [" Viewer@Example.com ",
                                                   VIEWER]})
        self.assertEqual(200, response.status_code, response.text)
        self.assertTrue(response.json()["is_private"])
        self.assertEqual([VIEWER], response.json()["viewer_emails"])
        stored = Paper.objects.get(id=self.owned_id)
        self.assertTrue(stored.is_private)
        self.assertEqual([VIEWER], list(stored.viewer_emails))
        self.assertEqual("make_private", stored.edit_history[-1]["action"])

    def test_making_public_keeps_viewer_list(self):
        self.make_private_as_owner()
        response = self.set_visibility(self.owned_id, {"is_private": False})
        self.assertEqual(200, response.status_code, response.text)
        stored = Paper.objects.get(id=self.owned_id)
        self.assertFalse(stored.is_private)
        self.assertEqual([VIEWER], list(stored.viewer_emails))

    def test_is_private_must_be_boolean(self):
        self.login(OWNER)
        response = self.set_visibility(self.owned_id, {"is_private": "yes"})
        self.assertEqual(400, response.status_code)

    def test_invalid_viewer_email_rejected(self):
        self.login(OWNER)
        response = self.set_viewers(self.owned_id, ["not-an-email"])
        self.assertEqual(400, response.status_code)
        self.assertIn("invalid viewer email", response.json()["error"])

    def test_owner_can_replace_viewers(self):
        self.make_private_as_owner()
        response = self.set_viewers(self.owned_id, [OTHER])
        self.assertEqual(200, response.status_code, response.text)
        self.assertEqual(
            [OTHER], list(Paper.objects.get(id=self.owned_id).viewer_emails))

    def test_admin_can_make_any_record_private(self):
        self.login(ADMIN)
        response = self.set_visibility(self.ownerless_id, {"is_private": True})
        self.assertEqual(200, response.status_code, response.text)

    def test_non_owner_cannot_change_visibility(self):
        self.login(OTHER)
        response = self.set_visibility(self.owned_id, {"is_private": True})
        self.assertEqual(403, response.status_code)
        self.assertFalse(Paper.objects.get(id=self.owned_id).is_private)

    def test_viewer_and_editor_cannot_manage_sharing(self):
        self.make_private_as_owner()
        Paper.objects(id=self.owned_id).update(set__editor_emails=[EDITOR])
        for email in (VIEWER, EDITOR):
            self.login(email)
            self.assertEqual(
                403, self.set_viewers(self.owned_id, [email, OTHER]).status_code)
            self.assertEqual(
                403, self.set_visibility(
                    self.owned_id, {"is_private": False}).status_code)

    def test_anonymous_cannot_change_visibility(self):
        response = self.client.put(
            f"/api/paper/{self.owned_id}/visibility", json={"is_private": True})
        self.assertEqual(401, response.status_code)

    def test_metadata_edit_cannot_change_sharing(self):
        self.make_private_as_owner()
        response = self.client.put(
            f"/api/paper/{self.owned_id}",
            json={"tags": ["x"], "is_private": False,
                  "viewer_emails": [OTHER]},
            headers={"X-CSRF-Token": self.csrf},
        )
        self.assertEqual(200, response.status_code, response.text)
        stored = Paper.objects.get(id=self.owned_id)
        self.assertTrue(stored.is_private)
        self.assertEqual([VIEWER], list(stored.viewer_emails))


class TestPrivateRecordAccess(PrivateTestBase):
    """Who can read a private record, and where it is hidden."""

    def search_flags(self):
        response = self.client.get("/api/search")
        assert response.status_code == 200, response.text
        return {item["_Search__id"]: item["_Search__is_private"]
                for item in response.json()}

    def test_private_record_hidden_from_search_for_others(self):
        self.assertIn(self.owned_id, self.search_ids())
        self.make_private_as_owner()
        self.login(OTHER)
        self.assertNotIn(self.owned_id, self.search_ids())
        self.assertIn(self.ownerless_id, self.search_ids())
        self.logout()
        self.assertNotIn(self.owned_id, self.search_ids())

    def test_private_record_listed_and_flagged_for_those_who_can_open_it(self):
        self.make_private_as_owner()
        Paper.objects(id=self.owned_id).update(set__editor_emails=[EDITOR])
        for email in (OWNER, VIEWER, EDITOR, ADMIN):
            self.login(email, is_admin=(email == ADMIN))
            flags = self.search_flags()
            self.assertTrue(flags.get(self.owned_id), email)
            self.assertFalse(flags[self.ownerless_id], email)

    def test_deactivated_private_record_never_listed(self):
        self.make_private_as_owner()
        Paper.objects(id=self.owned_id).update(set__is_active=False)
        self.login(VIEWER)
        self.assertNotIn(self.owned_id, self.search_ids())

    def test_filtered_search_respects_visibility(self):
        self.make_private_as_owner()
        tag = Paper.objects.get(id=self.owned_id).tags[0]
        self.login(OTHER)
        ids = {i["_Search__id"] for i in self.client.get(
            "/api/search", params={"tags": tag}).json()}
        self.assertNotIn(self.owned_id, ids)
        self.login(VIEWER)
        ids = {i["_Search__id"] for i in self.client.get(
            "/api/search", params={"tags": tag}).json()}
        self.assertIn(self.owned_id, ids)

    def test_private_record_hidden_from_facets(self):
        Paper.objects(id=self.ownerless_id).delete()
        self.assertTrue(self.client.get("/api/collections").json())
        self.make_private_as_owner()
        self.assertEqual([], self.client.get("/api/collections").json())
        self.assertEqual([], self.client.get("/api/authors").json())

    def test_detail_readable_by_owner_viewer_editor_admin(self):
        self.make_private_as_owner()
        Paper.objects(id=self.owned_id).update(set__editor_emails=[EDITOR])
        for email in (OWNER, VIEWER, EDITOR, ADMIN):
            self.login(email, is_admin=(email == ADMIN))
            response = self.client.get(f"/api/paper/{self.owned_id}")
            self.assertEqual(200, response.status_code, email)
            self.assertEqual(
                200, self.client.get(
                    f"/api/workflow/{self.owned_id}").status_code, email)

    def test_detail_hidden_from_others(self):
        self.make_private_as_owner()
        self.login(OTHER)
        for path in (f"/api/paper/{self.owned_id}",
                     f"/api/workflow/{self.owned_id}",
                     f"/api/paper/{self.owned_id}/curator",
                     f"/api/paper/{self.owned_id}/permissions"):
            self.assertEqual(404, self.client.get(path).status_code, path)
        self.logout()
        self.assertEqual(
            404, self.client.get(f"/api/paper/{self.owned_id}").status_code)

    def test_public_again_is_readable_by_anyone(self):
        self.make_private_as_owner()
        self.set_visibility(self.owned_id, {"is_private": False})
        self.logout()
        self.assertEqual(
            200, self.client.get(f"/api/paper/{self.owned_id}").status_code)
        self.assertIn(self.owned_id, self.search_ids())

    def test_viewer_cannot_edit(self):
        self.make_private_as_owner()
        self.login(VIEWER)
        body = self.client.get(
            f"/api/paper/{self.owned_id}/permissions").json()
        self.assertFalse(body["can_edit"])
        self.assertFalse(body["can_manage"])
        self.assertEqual("viewer", body["role"])
        self.assertTrue(body["is_private"])
        self.assertNotIn("viewer_emails", body)
        self.assertEqual(
            403, self.client.get(f"/api/paper/{self.owned_id}/raw").status_code)
        response = self.client.put(
            f"/api/paper/{self.owned_id}", json={"tags": ["x"]},
            headers={"X-CSRF-Token": self.csrf})
        self.assertEqual(403, response.status_code)

    def test_viewer_cannot_see_deactivated_private_record(self):
        self.make_private_as_owner()
        Paper.objects(id=self.owned_id).update(set__is_active=False)
        self.login(VIEWER)
        self.assertEqual(
            404, self.client.get(f"/api/paper/{self.owned_id}").status_code)

    def test_viewer_list_ignored_while_public(self):
        Paper.objects(id=self.owned_id).update(set__viewer_emails=[VIEWER])
        self.login(VIEWER)
        papers = self.client.get("/api/account/papers").json()["papers"]
        self.assertEqual([], papers)


class TestAccountSharedRecords(PrivateTestBase):
    def test_shared_record_listed_for_viewer_without_share_lists(self):
        self.make_private_as_owner()
        Paper.objects(id=self.owned_id).update(set__editor_emails=[EDITOR])
        self.login(VIEWER)
        papers = self.client.get("/api/account/papers").json()["papers"]
        self.assertEqual(1, len(papers))
        self.assertEqual("viewer", papers[0]["role"])
        self.assertTrue(papers[0]["is_private"])
        self.assertEqual([], papers[0]["editor_emails"])
        self.assertEqual([], papers[0]["viewer_emails"])

    def test_owner_sees_private_flag_and_viewers(self):
        self.make_private_as_owner()
        papers = self.client.get("/api/account/papers").json()["papers"]
        self.assertEqual("owner", papers[0]["role"])
        self.assertTrue(papers[0]["is_private"])
        self.assertEqual([VIEWER], papers[0]["viewer_emails"])
