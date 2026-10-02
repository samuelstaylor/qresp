import { useState } from "react";
import PropTypes from "prop-types";

import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
  IconButton,
  Tooltip,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { CheckCircle, Edit, ExpandMore } from "@mui/icons-material";

const StyledAccordion = styled(Accordion)(({ theme }) => ({
  borderRadius: "8px !important",
  margin: "10px 0 !important",
  border: `1px solid ${theme.palette.divider}`,
  boxShadow: "none",
  "&::before": { display: "none" },
  "&.Mui-expanded": {
    borderColor: "#800000",
    borderLeftWidth: 3,
  },
}));

const StyledAccordionSummary = styled(AccordionSummary)({
  backgroundColor: "transparent",
  minHeight: 52,
  "&.Mui-expanded": { minHeight: 52 },
  "& .MuiAccordionSummary-content": {
    margin: "10px 0",
    alignItems: "center",
    gap: 8,
  },
});

const Drawer = (props) => {
  const { heading, children, defaultOpen = false, editor, status } = props;
  const [open, setOpen] = useState(defaultOpen);

  return (
    <StyledAccordion
      slotProps={{ transition: { timeout: 200 } }}
      expanded={open}
      onChange={(_, expanded) => setOpen(expanded)}
    >
      <StyledAccordionSummary expandIcon={<ExpandMore />}>
        {status === "complete" && (
          <CheckCircle sx={{ fontSize: 18, color: "#2e7d32", flexShrink: 0 }} />
        )}
        <Typography
          variant="subtitle1"
          fontWeight={600}
          sx={{ color: open ? "#800000" : "#333333", flex: 1, transition: "color 0.2s" }}
        >
          {heading}
        </Typography>
        {editor && (
          <Tooltip title="Edit" placement="right" arrow>
            <IconButton
              size="small"
              onClick={(e) => { e.stopPropagation(); editor(); }}
              sx={{ color: "#800000", mr: 0.5 }}
            >
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </StyledAccordionSummary>
      <AccordionDetails sx={{ pt: 0, pb: 2 }}>
        <Box sx={{ width: "100%", display: "flex", flexDirection: "column" }}>
          {children}
        </Box>
      </AccordionDetails>
    </StyledAccordion>
  );
};

export { StyledAccordion, StyledAccordionSummary };

Drawer.propTypes = {
  heading: PropTypes.string.isRequired,
  children: PropTypes.any,
  defaultOpen: PropTypes.bool,
  editor: PropTypes.func,
  status: PropTypes.oneOf(["complete", "incomplete", "optional"]),
};

export default Drawer;
