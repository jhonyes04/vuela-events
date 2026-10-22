import { ReactNodeViewRenderer } from '@tiptap/react';
import Image from '@tiptap/extension-image';
import { ResizableImageView } from './ResizableImageView';

export const ResizableImage = Image.extend({
    addNodeView() {
        return ReactNodeViewRenderer(ResizableImageView);
    },
});
