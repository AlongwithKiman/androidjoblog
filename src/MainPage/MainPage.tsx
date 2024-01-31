import { useState } from "react";
import {
  JobInfo,
  JobScheduleInfo,
  ParsedLogsDict,
  parseJobHistory,
  parseJobSchedule,
  readFileContent,
} from "../utils/util";
import { DataGrid, GridRowsProp, GridColDef } from "@mui/x-data-grid";
import Divider from "@mui/material/Divider";
import Button from "@mui/material/Button";
import ButtonGroup from "@mui/material/ButtonGroup";

const MainPage = () => {
  // job_number: string | null;
  // job_name: string | null;
  // required_constraints: string | null;
  // restrict_reason: string | null;
  const [jobScheduleInfo, setJobScheduleInfo] = useState<JobScheduleInfo[]>([]);
  const [jobHistoryInfo, setJobHistoryInfo] = useState<ParsedLogsDict>();

  const buttons = ["Registered Job", "Job History"];
  const [clickedButton, setClickedButton] = useState<string | null>(null);

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

  const rows: GridRowsProp = jobScheduleInfo.map((job) => ({
    id: job.job_number,
    job_number: job.job_number || "",
    job_name: job.job_name || "",
    required_constraints: job.required_constraints || "",
    restrict_reason: job.restrict_reason || "",
  }));

  const columns: GridColDef[] = [
    { field: "job_number", headerName: "Job #", width: 150 },
    { field: "job_name", headerName: "Job Name", width: 500 },
    {
      field: "required_constraints",
      headerName: "Required Constraints",
      width: 300,
    },
    { field: "restrict_reason", headerName: "Restrict Reason", width: 150 },
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
        <div style={{ height: 500, width: "100%" }}>
          <DataGrid rows={rows} columns={columns} />
        </div>
      ) : (
        <div>TODO</div>
      )}

      {clickedButton}
    </>
  );
};

export default MainPage;
