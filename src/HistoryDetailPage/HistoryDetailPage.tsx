import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Button from "@mui/material/Button";
import { OneJobInfo, JobInfo } from "../utils/util";

const HistoryDetailPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const historyObject: JobInfo = location.state?.historyObject || null;

  if (!historyObject) {
    return <div>Error: History Object not found</div>;
  }

  const goBackToMainPage = () => {
    navigate("/");
  };

  return (
    <div style={{ padding: 16 }}>
      <Typography variant="h4" gutterBottom>
        Job History Details
      </Typography>

      <Divider style={{ marginBottom: 16 }} />

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper
            style={{
              padding: 16,
              whiteSpace: "pre-line",
              minHeight: "400px",
              maxHeight: "400px",
              overflowY: "auto",
            }}
          >
            <Typography variant="h5" gutterBottom>
              Basic Information
            </Typography>
            <Typography>
              <strong>Job Name:</strong> {historyObject.job_name}
            </Typography>
            <Typography>
              <strong>Count:</strong> {historyObject.count}
            </Typography>
            <Typography>
              <strong>Avg Time (ms):</strong> {historyObject.avg_time}
            </Typography>
            <Typography>
              <strong>Time Interval:</strong>{" "}
              {historyObject.time_interval.join(", ")}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper
            style={{
              padding: 16,
              overflowX: "auto",
              minHeight: "400px",
              maxHeight: "400px",
            }}
          >
            <Typography variant="h5" gutterBottom>
              Job Details
            </Typography>
            {historyObject.jobs.map((job: OneJobInfo) => (
              <div key={job.job_id} style={{ marginBottom: 16 }}>
                <Typography>
                  <strong>Job ID:</strong> {job.job_id}
                </Typography>
                <Typography>
                  <strong>Start Time:</strong> {job.start_time}
                </Typography>
                <Typography>
                  <strong>End Time:</strong> {job.end_time}
                </Typography>
                <Typography>
                  <strong>Execution Time:</strong> {job.exec_time} ms
                </Typography>
                <Typography>
                  <strong>Terminate Status:</strong>{" "}
                  {job.terminate_status.toUpperCase()}
                </Typography>
              </div>
            ))}
          </Paper>
        </Grid>
      </Grid>

      {/* Go Back Button */}
      <Button
        variant="contained"
        color="primary"
        style={{ marginTop: 16 }}
        onClick={goBackToMainPage}
      >
        Go Back
      </Button>
    </div>
  );
};

export default HistoryDetailPage;
