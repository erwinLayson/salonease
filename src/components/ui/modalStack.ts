// Shared stack for overlay dialogs (Modal + Drawer) so only the topmost
// one reacts to Escape, even when they are stacked.
const stack: string[] = [];

export const pushDialog = (id: string): void => {
    stack.push(id);
};

export const popDialog = (id: string): void => {
    const index = stack.lastIndexOf(id);
    if (index !== -1) {
        stack.splice(index, 1);
    }
};

export const isTopDialog = (id: string): boolean =>
    stack[stack.length - 1] === id;
