import React from 'react';
import { IMAGE_FILE_ACCEPT } from '../../utils/imageFileInput';

/**
 * Gallery + camera file inputs. Use htmlFor on labels pointing at `id` for gallery pick.
 * @param {'user' | 'environment'} capture - front camera for selfies, rear for documents
 */
export const ImageFileInputs = ({ id, onChange, capture = 'environment', className = 'hidden' }) => (
  <>
    <input
      id={id}
      type="file"
      accept={IMAGE_FILE_ACCEPT}
      onChange={onChange}
      className={className}
    />
    <input
      id={`${id}-camera`}
      type="file"
      accept={IMAGE_FILE_ACCEPT}
      capture={capture}
      onChange={onChange}
      className={className}
    />
  </>
);

export const MobileTakePhotoButton = ({ inputId, label = 'Take Photo', className = '' }) => {
  const openCamera = (e) => {
    e.preventDefault();
    e.stopPropagation();
    document.getElementById(`${inputId}-camera`)?.click();
  };

  return (
    <button
      type="button"
      onClick={openCamera}
      className={`md:hidden text-xs font-semibold underline-offset-2 hover:underline ${className}`}
      style={{
        fontFamily: 'Poppins',
        color: '#61CB08',
      }}
    >
      {label}
    </button>
  );
};
