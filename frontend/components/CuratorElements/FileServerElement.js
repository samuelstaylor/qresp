import { useContext, useEffect, useState } from "react";

import { Box, Button, Typography } from "@mui/material";

import FileServerInfoForm from "../CuratorForms/FileServerInfoForm";
import FileServerInfo from "../Paper/FileServer";

import CuratorContext from "../../Context/Curator/curatorContext";
import CuratorHelperContext from "../../Context/CuratorHelpers/curatorHelperContext";
import SwitchFade from "../switchFade";
import { CODE_HOSTS, needsFolder } from "../../Utils/workTypes";

const FileServerElement = () => {
  const { fileServerPath, workType, codeHost } = useContext(CuratorContext);
  const { editing, setEditing } = useContext(CuratorHelperContext);
  // Code on GitHub or GitLab has no folder to save, so an empty section is
  // finished, not unsaved -- publishing is not held up by it. Adding a folder
  // anyway opens the form without marking the section unsaved.
  const required = needsFolder(workType, codeHost);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (fileServerPath != "") {
      setEditing("fileServerPathInfo", false);
    } else setEditing("fileServerPathInfo", required);
    if (required || fileServerPath) setAdding(false);
  }, [fileServerPath, required]);

  return (
    <SwitchFade
      editing={editing.fileServerPathInfo || adding}
      form={
        <Box>
          <FileServerInfoForm
            editor={() => {
              setAdding(false);
              setEditing("fileServerPathInfo", false);
            }}
          />
          {adding && (
            <Button size="small" onClick={() => setAdding(false)} sx={{ mt: 1, textTransform: "none" }}>
              Not now
            </Button>
          )}
        </Box>
      }
      display={
        <FileServerInfo
          fileserverpath={fileServerPath}
          editor={() =>
            required || fileServerPath
              ? setEditing("fileServerPathInfo", true)
              : setAdding(true)
          }
          defaultOpen={true}
        >
          {!required && !fileServerPath && (
            <Typography variant="body2" color="text.secondary" data-testid="fileserver-not-needed">
              {`Not needed: the code is on ${CODE_HOSTS.repository.label}. ` +
                "Use Edit to add an RCC folder as well, e.g. for its data or figures."}
            </Typography>
          )}
        </FileServerInfo>
      }
    />
  );
};

export default FileServerElement;
