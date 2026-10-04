import { useContext, useEffect, useRef } from "react";

import ReferenceInfoForm from "../CuratorForms/ReferenceInfoForm";
import ReferenceC from "../Paper/ReferenceC";

import CuratorContext from "../../Context/Curator/curatorContext";
import CuratorHelperContext from "../../Context/CuratorHelpers/curatorHelperContext";

import SwitchFade from "../switchFade";
import { matchesSaved, rememberSaved, signatureOf } from "../../Utils/savedSection";

const ReferenceInfoElement = () => {
  const { referenceInfo } = useContext(CuratorContext);
  const { editing, setEditing } = useContext(CuratorHelperContext);

  const signature = signatureOf(referenceInfo);
  // Opened only because the page loaded blank -- not by the curator's Edit.
  const openedForBlank = useRef(false);

  useEffect(() => {
    // Shown as saved, with something in it: remember it, so it is still
    // saved after the page remounts (e.g. coming back from the preview).
    if (!editing.referenceInfo && referenceInfo.title) {
      rememberSaved("referenceInfo", signature);
      return;
    }
    // A blank new record starts in edit mode.
    if (!referenceInfo.title && !editing.referenceInfo) {
      openedForBlank.current = true;
      setEditing("referenceInfo", true);
      return;
    }
    // The draft arrives a moment after the page: if it is exactly what was
    // last saved, it is saved. Importing a manuscript or applying an AI
    // proposal changes it, so those never count as an implicit Save --
    // explicit Save is still the only other way this section closes.
    if (
      openedForBlank.current &&
      editing.referenceInfo &&
      referenceInfo.title &&
      matchesSaved("referenceInfo", signature)
    ) {
      openedForBlank.current = false;
      setEditing("referenceInfo", false);
    }
  }, [editing.referenceInfo, referenceInfo.title, signature, setEditing]);

  return (
    <SwitchFade
      editing={editing.referenceInfo}
      form={
        <ReferenceInfoForm editor={() => setEditing("referenceInfo", false)} />
      }
      display={
        <ReferenceC
          referenceInfo={referenceInfo}
          editor={() => setEditing("referenceInfo", true)}
          defaultOpen={true}
        />
      }
    />
  );
};

export default ReferenceInfoElement;
