import { useEffect, useState } from "react";
import PropTypes from "prop-types";

import {
  Avatar,
  Box,
  Button,
  ButtonBase,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Close,
  GroupAddOutlined,
  LockOutlined,
  PersonOutlined,
  PublicOutlined,
} from "@mui/icons-material";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const splitEmails = (text) =>
  (text || "")
    .split(/[\s,;]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

// One selectable visibility card (Public / Private).
const VisibilityOption = ({ selected, icon, title, description, onClick, testId }) => (
  <ButtonBase
    role="radio"
    aria-checked={selected}
    data-testid={testId}
    onClick={onClick}
    sx={{
      flex: 1,
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "flex-start",
      gap: 1.5,
      p: 1.5,
      textAlign: "left",
      borderRadius: 2,
      border: "1px solid",
      borderColor: selected ? "primary.main" : "divider",
      bgcolor: selected ? "action.selected" : "transparent",
      transition: "border-color 120ms, background-color 120ms",
      "&:hover": { borderColor: selected ? "primary.main" : "text.secondary" },
    }}
  >
    <Box sx={{ color: selected ? "primary.main" : "text.secondary", mt: 0.25 }}>
      {icon}
    </Box>
    <Box>
      <Typography variant="subtitle2" fontWeight={700}>
        {title}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {description}
      </Typography>
    </Box>
  </ButtonBase>
);

VisibilityOption.propTypes = {
  selected: PropTypes.bool,
  icon: PropTypes.node,
  title: PropTypes.string,
  description: PropTypes.string,
  onClick: PropTypes.func,
  testId: PropTypes.string,
};

// Visibility + collaborator management for one record. Shared by My Records
// and the record page; the caller performs the save (PUT /visibility) and
// may throw an Error whose message is shown inline.
const SharingDialog = ({
  open,
  onClose,
  recordTitle,
  initialPrivate,
  initialViewers,
  onSave,
}) => {
  const [isPrivate, setIsPrivate] = useState(false);
  const [viewers, setViewers] = useState([]);
  const [draft, setDraft] = useState("");
  const [draftError, setDraftError] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setIsPrivate(Boolean(initialPrivate));
    setViewers(initialViewers || []);
    setDraft("");
    setDraftError("");
    setError("");
    setSaving(false);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Adds every valid address in the draft; returns the new list, or null
  // when something in the draft is not an email.
  const commitDraft = () => {
    const emails = splitEmails(draft);
    const invalid = emails.filter((e) => !EMAIL.test(e));
    if (invalid.length) {
      setDraftError(`Not a valid email: ${invalid.join(", ")}`);
      return null;
    }
    const next = [...viewers];
    emails.forEach((e) => {
      if (!next.includes(e)) next.push(e);
    });
    setViewers(next);
    setDraft("");
    setDraftError("");
    return next;
  };

  const save = async () => {
    // An address typed but not yet added is almost always meant to be saved.
    const list = draft.trim() ? commitDraft() : viewers;
    if (list === null) return;
    setSaving(true);
    setError("");
    try {
      await onSave({ isPrivate, viewers: list });
    } catch (err) {
      setError(err?.message || "Updating sharing failed, please try again.");
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, pb: 0.5 }}>
        <GroupAddOutlined color="primary" />
        Share record
      </DialogTitle>
      <DialogContent>
        {recordTitle ? (
          <Typography variant="body2" color="text.secondary" noWrap sx={{ mb: 2 }}>
            {recordTitle}
          </Typography>
        ) : null}

        <Typography variant="overline" color="text.secondary">
          Visibility
        </Typography>
        <Box role="radiogroup" sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mb: 2.5 }}>
          <VisibilityOption
            selected={!isPrivate}
            icon={<PublicOutlined />}
            title="Public"
            description="Anyone can find it in search and the explorer."
            onClick={() => setIsPrivate(false)}
            testId="sharing-visibility-public"
          />
          <VisibilityOption
            selected={isPrivate}
            icon={<LockOutlined />}
            title="Private"
            description="Only you, editors, admins and collaborators can open it."
            onClick={() => setIsPrivate(true)}
            testId="sharing-visibility-private"
          />
        </Box>

        <Divider sx={{ mb: 2 }} />

        <Typography variant="overline" color="text.secondary">
          Collaborators
        </Typography>
        {!isPrivate ? (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Public records are open to everyone. Make the record private to
            limit it to the people listed here.
          </Typography>
        ) : null}
        <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
          <TextField
            size="small"
            fullWidth
            placeholder="Add people by email"
            value={draft}
            disabled={!isPrivate}
            error={Boolean(draftError)}
            helperText={draftError || " "}
            onChange={(e) => {
              setDraft(e.target.value);
              setDraftError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitDraft();
              }
            }}
            slotProps={{ htmlInput: { "data-testid": "sharing-add-input" } }}
          />
          <Button
            variant="outlined"
            onClick={commitDraft}
            disabled={!isPrivate || !draft.trim()}
            data-testid="sharing-add"
            sx={{ height: 40, flexShrink: 0 }}
          >
            Add
          </Button>
        </Box>

        <Box
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
            opacity: isPrivate ? 1 : 0.55,
          }}
        >
          {viewers.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: "center" }}>
              No collaborators yet.
            </Typography>
          ) : (
            viewers.map((email, index) => (
              <Box
                key={email}
                data-testid="sharing-collaborator"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  px: 1.5,
                  py: 1,
                  borderTop: index ? "1px solid" : "none",
                  borderColor: "divider",
                }}
              >
                <Avatar sx={{ width: 32, height: 32, bgcolor: "action.selected", color: "text.secondary" }}>
                  <PersonOutlined fontSize="small" />
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" noWrap>
                    {email}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Can view
                  </Typography>
                </Box>
                <Tooltip title="Remove">
                  <span>
                    <IconButton
                      size="small"
                      aria-label={`Remove ${email}`}
                      disabled={!isPrivate}
                      onClick={() => setViewers((list) => list.filter((e) => e !== email))}
                    >
                      <Close fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
            ))
          )}
        </Box>
        <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 1 }}>
          Collaborators sign in with this email to view the record. They
          cannot edit it; add them as editors for that.
        </Typography>

        {error ? (
          <Typography variant="body2" color="error" sx={{ mt: 1.5 }}>
            {error}
          </Typography>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disableElevation
          onClick={save}
          disabled={saving}
          data-testid="sharing-save"
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

SharingDialog.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  recordTitle: PropTypes.string,
  initialPrivate: PropTypes.bool,
  initialViewers: PropTypes.arrayOf(PropTypes.string),
  onSave: PropTypes.func,
};

export default SharingDialog;
