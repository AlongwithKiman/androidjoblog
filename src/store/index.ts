import { configureStore } from "@reduxjs/toolkit";
import logReducer from "./slices/log/log";

export const store = configureStore({
  reducer: {
    log: logReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppStore = typeof store;
export type AppDispatch = typeof store.dispatch;
