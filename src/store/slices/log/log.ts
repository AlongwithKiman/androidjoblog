// logSlice.ts
import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "../..";
import {
  JobInfo,
  JobScheduleInfo,
  parseJobHistory,
  parseJobSchedule,
  readFileContent,
} from "../../../utils/util";

export interface LogInfo {
  jobScheduleInfo: JobScheduleInfo[];
  jobHistoryInfo: JobInfo[];
  //   uploadedFile: File | null;
}

const initialState: LogInfo = {
  jobScheduleInfo: [],
  jobHistoryInfo: [],
  //   uploadedFile: null,
};

export const fetchLog = createAsyncThunk("log/fetchLog", async (file: File) => {
  try {
    const fileContent = await readFileContent(file);
    const jobScheduleInfo = parseJobSchedule(fileContent);
    const jobHistoryInfo = parseJobHistory(fileContent);

    console.log(jobScheduleInfo, jobHistoryInfo);
    return { jobScheduleInfo, jobHistoryInfo };
  } catch (error) {
    throw new Error("Error reading file: " + error);
  }
});

export const logSlice = createSlice({
  name: "log",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchLog.fulfilled, (state, action: PayloadAction<LogInfo>) => {
        // Handle successful fetch
        state.jobScheduleInfo = action.payload.jobScheduleInfo;
        state.jobHistoryInfo = action.payload.jobHistoryInfo;
        // state.uploadedFile = action.payload.uploadedFile;
      })
      .addCase(fetchLog.rejected, (state, action) => {
        // Handle fetch error
        console.error("Error fetching log:", action.error.message);
      });
  },
});
export const logActions = logSlice.actions;
export const selectLog = (state: RootState) => state.log;

export default logSlice.reducer;
