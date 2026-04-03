const useTreeLogic = () => {
    function insertNode(tree, folderId, item, isFolder) {
        console.log("Tree Logic --==>", tree, folderId, item, isFolder)

        if (tree.id === folderId && tree.isFolder) {
            if (Array.isArray(tree.Links)) {
                tree.Links.push({
                    id: String(Number(tree.Links.at(-1).id) + 1),
                    name: item,
                    isFolder: isFolder,
                    Links: [],
                });
            }
            console.log('tree',tree)
            return tree;
        }
        if (Array.isArray(tree.Links)) {
            tree.Links = tree.Links.map((child) => insertNode(child, folderId, item, isFolder));
        }
        console.log('tree',tree)

        return tree;
    }
    return { insertNode };
};
export default useTreeLogic;
