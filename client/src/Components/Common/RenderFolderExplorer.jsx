import React from 'react'

export const RenderFolderExplorer = () => {
  return (
    const renderFolderOptions = (folders, level = 0) => {
        return folders.map(({ id, folderName, childFolders }) => (
            <React.Fragment key={id}>
                <option value={id}>{'— '.repeat(level) + folderName}</option>
                {childFolders && childFolders.length > 0 && renderFolderOptions(childFolders, level + 1)}
            </React.Fragment>
        ));
    };
}
