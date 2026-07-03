import { aliases, mdi } from 'vuetify/iconsets/mdi-svg';
import {
  mdiClose,
  mdiCodeJson,
  mdiCrop,
  mdiCropFree,
  mdiDotsVertical,
  mdiDownload,
  mdiEyeOutline,
  mdiFileImage,
  mdiImagePlus,
  mdiImport,
  mdiRedo,
  mdiRestore,
  mdiUndo,
} from '@mdi/js';

export const icons = {
  defaultSet: 'mdi',
  aliases: {
    ...aliases,
    close: mdiClose,
    codeJson: mdiCodeJson,
    crop: mdiCrop,
    cropFree: mdiCropFree,
    dotsVertical: mdiDotsVertical,
    download: mdiDownload,
    eyeOutline: mdiEyeOutline,
    fileImage: mdiFileImage,
    imagePlus: mdiImagePlus,
    import: mdiImport,
    redo: mdiRedo,
    restore: mdiRestore,
    undo: mdiUndo,
  },
  sets: { mdi },
};
