
// dialog actions
export const QUEUE_DIALOG = 'QUEUE_DIALOG';
export const queueDialog = dialog => ({ type: QUEUE_DIALOG, dialog });

export const PUSH_DIALOG = 'PUSH_DIALOG';
export const pushDialog = dialog => ({ type: PUSH_DIALOG, dialog });

export const CLOSE_DIALOG = 'CLOSE_DIALOG';
export const closeDialog = () => ({ type: CLOSE_DIALOG });


// snackbar actions
export const QUEUE_SNACK = 'QUEUE_SNACK';
export const queueSnack = snack => ({ type: QUEUE_SNACK, snack });

export const PUSH_SNACK = 'PUSH_SNACK';
export const pushSnack = snack => ({ type: PUSH_SNACK, snack });

export const DISMISS_SNACK = 'DISMISS_SNACK';
export const dismissSnack = () => ({ type: DISMISS_SNACK });
