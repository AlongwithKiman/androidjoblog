import { useState } from "react";
import {
  JobHistoryInfo,
  JobInfo,
  JobScheduleInfo,
  ParsedLogsDict,
  parseJobHistory,
  parseJobSchedule,
  readFileContent,
} from "../utils/util";
import {
  DataGrid,
  GridRowsProp,
  GridColDef,
  GridEventListener,
} from "@mui/x-data-grid";
import Divider from "@mui/material/Divider";
import Button from "@mui/material/Button";
import ButtonGroup from "@mui/material/ButtonGroup";
import { useNavigate } from "react-router-dom";

const MainPage = () => {
  const [jobScheduleInfo, setJobScheduleInfo] = useState<JobScheduleInfo[]>([]);
  const [jobHistoryInfo, setJobHistoryInfo] = useState<JobInfo[]>([]);

  const buttons = ["Registered Job", "Job History"];
  const [clickedButton, setClickedButton] = useState<string | null>(
    "Registered Job"
  );

  const onClickButton = (buttonName: string) => {
    setClickedButton(buttonName);
  };

  const onClickUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileInput = event.target;
    if (fileInput.files && fileInput.files.length > 0) {
      const file = fileInput.files[0];
      try {
        const fileContent = await readFileContent(file);
        const jobScheduleInfo = parseJobSchedule(fileContent);
        const jobHistoryInfo = parseJobHistory(fileContent);
        setJobScheduleInfo(jobScheduleInfo);
        setJobHistoryInfo(jobHistoryInfo);
      } catch (error) {
        console.error("파일 읽기 오류:", error);
      }
    }
  };

  const navigate = useNavigate();
  const onClickHistoryRow: GridEventListener<"rowClick"> = (
    params, // GridRowParams
    event, // MuiEvent<React.MouseEvent<HTMLElement>>
    details // GridCallbackDetails
  ) => {
    const selectedJob = params.row;

    console.log("debug");
    console.log(selectedJob);
    const historyObject = jobHistoryInfo.find(
      (element) => element.job_name === selectedJob.job_name
    );
    navigate("/detail", { state: { historyObject } });
  };

  const scheduleInfoRows: GridRowsProp = jobScheduleInfo.map((job) => ({
    id: job.job_number,
    package_name: job.package_name || "",
    job_number: job.job_number || "",
    job_name: job.job_name || "",
    required_constraints: job.required_constraints || "",
    restrict_reason: job.restrict_reason || "",
  }));
  const scheduleInfoColumns: GridColDef[] = [
    { field: "package_name", headerName: "Package", width: 150 },
    { field: "job_name", headerName: "Job Name", width: 500 },
    { field: "job_number", headerName: "Job #", width: 150 },
    {
      field: "required_constraints",
      headerName: "Required Constraints",
      width: 300,
    },
    { field: "restrict_reason", headerName: "Restrict Reason", width: 150 },
  ];

  const historyInfoRows: GridRowsProp = jobHistoryInfo.map((job) => ({
    id: job.job_name,
    job_name: job.job_name || "",
    count: job.count,
    avg_time: job.avg_time,
    time_interval: job.time_interval,
    jobs: job.jobs.map((job) => job.job_id),
  }));

  const historyInfoColumns: GridColDef[] = [
    { field: "job_name", headerName: "Job Name", width: 700 },
    {
      field: "count",
      headerName: "Count",
      width: 100,
    },
    { field: "jobs", headerName: "job ids", width: 150 },
    { field: "avg_time", headerName: "Avg time(ms)", width: 150 },
    { field: "time_interval", headerName: "Time Interval(ms)", width: 150 },
  ];

  return (
    <>
      <div>
        <input type="file" onChange={onClickUpload}></input>
      </div>
      <ButtonGroup
        style={{
          display: "flex",
          width: "300px",
          height: "50px",
        }}
      >
        {buttons.map((button) => (
          <Button
            key={button}
            variant="contained"
            onClick={() => onClickButton(button)}
            color={clickedButton === button ? "secondary" : "primary"}
            // style={{
            //   backgroundColor: clickedButton === button ? "#1976D2" : "#606060", // Change this color to your desired darker color
            // }}
          >
            {button}
          </Button>
        ))}
      </ButtonGroup>

      <Divider />
      {clickedButton === "Registered Job" ? (
        <div style={{ height: 700, width: "100%" }}>
          <DataGrid rows={scheduleInfoRows} columns={scheduleInfoColumns} />
        </div>
      ) : clickedButton === "Job History" ? (
        <div style={{ height: 700, width: "100%" }}>
          <DataGrid
            rows={historyInfoRows}
            columns={historyInfoColumns}
            onRowClick={onClickHistoryRow}
          />
        </div>
      ) : (
        <div>TODO</div>
      )}
    </>
  );
};

export default MainPage;
