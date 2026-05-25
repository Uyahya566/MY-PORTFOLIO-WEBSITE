import React from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string;
        'ios-src'?: string;
        alt?: string;
        'shadow-intensity'?: string;
        'camera-controls'?: boolean | string;
        'auto-rotate'?: boolean | string;
        ar?: boolean | string;
        class?: string;
      };
    }
  }
}
