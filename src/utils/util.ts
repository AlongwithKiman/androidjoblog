export interface TsData {
  start_time: string;
  end_time?: string;
  exec_time?: number;
}

export interface JobInfo {
  job_details: string;
  count: number;
  ts: TsData[];
  avg_time?: number;
}

export interface JobScheduleInfo {
  job_number: string | null;
  job_name: string | null;
  required_constraints: string | null;
  restrict_reason: string | null;
}

export interface ParsedLogsDict {
  [key: string]: JobInfo;
}

function parseTime(timeStr: string): number {
  const match = timeStr.match(/(?:(\d+)m)?(?:(\d+)s)?(?:(\d+)ms)?/);
  if (match) {
    const [_, minutes, seconds, milliseconds] = match.map((x) =>
      x ? parseInt(x) : 0
    );
    const totalMilliseconds =
      (minutes * 60 + seconds + milliseconds / 1000) * 1000;
    return totalMilliseconds;
  } else {
    throw new Error("Invalid time format");
  }
}

export function parseJobSchedule(log: string): JobScheduleInfo[] {
  const match = log.match(/Registered \d+ jobs:(.+)/s);
  const parsedLogs: JobScheduleInfo[] = [];

  if (match) {
    const jobLogs = match[1];

    const jobMatches = jobLogs.matchAll(/JOB #([^:\s]+):(.+?)(?=\s*JOB #|$)/gs);

    for (const jobMatch of jobMatches) {
      const jobNumber = jobMatch[1];
      const jobInfo = jobMatch[2].trim();

      const jobNameMatch = jobInfo.match(/Service: (.+)/);
      const requiredConstraintsMatch = jobInfo.match(
        /Required constraints: (.+)/
      );
      const restrictReasonMatch = jobInfo.match(/  Restricted due to: (.+)/);

      const jobName = jobNameMatch ? jobNameMatch[1].trim() : null;
      const requiredConstraints = requiredConstraintsMatch
        ? requiredConstraintsMatch[1].trim()
        : null;
      const restrictReason = restrictReasonMatch
        ? restrictReasonMatch[1].trim()
        : null;

      parsedLogs.push({
        job_number: jobNumber,
        job_name: jobName,
        required_constraints: requiredConstraints,
        restrict_reason: restrictReason,
      });
    }
  }

  return parsedLogs;
}

export function parseJobHistory(log: string): ParsedLogsDict {
  const startIdx = log.indexOf("Job history:");
  const endIdx = log.indexOf("Pending queue:");

  const jobHistoryLog = log.substring(startIdx, endIdx).trim();
  const lines = jobHistoryLog.split("\n").slice(1);
  const parsedLogsDict: ParsedLogsDict = {};

  for (const line of lines) {
    const match = line.match(
      /-([\dms]+)\s+(START(?:-P)?|STOP(?:-P)?): (#\S+)\s+(.+)/
    );

    if (match) {
      const [, time, action, jobId, jobDetails] = match;
      const ids: string[] = [];

      ids.push(jobId);

      if (action.includes("START")) {
        if (!parsedLogsDict[jobId]) {
          parsedLogsDict[jobId] = {
            job_details: jobDetails.trim(),
            count: 1,
            ts: [{ start_time: time }],
          };
        } else {
          parsedLogsDict[jobId].count += 1;
          parsedLogsDict[jobId].ts.push({ start_time: time });
        }
      } else if (action.includes("STOP")) {
        parsedLogsDict[jobId].ts[parsedLogsDict[jobId].ts.length - 1].end_time =
          time;
        const startTime =
          parsedLogsDict[jobId].ts[parsedLogsDict[jobId].ts.length - 1]
            .start_time;
        parsedLogsDict[jobId].ts[
          parsedLogsDict[jobId].ts.length - 1
        ].exec_time = parseTime(startTime) - parseTime(time);
      }

      console.log(`index ${line} registered`);
    } else {
      console.log(`${line} not matched!`);
    }
  }

  for (const key in parsedLogsDict) {
    const info = parsedLogsDict[key];
    const execTimeAvg = Math.floor(
      info.ts.reduce((sum, ts) => sum + (ts.exec_time || 0), 0) / info.ts.length
    );
    parsedLogsDict[key].avg_time = execTimeAvg;
  }

  return parsedLogsDict;
}

export const readFileContent = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      if (event.target) {
        const content = event.target.result as string;
        resolve(content);
      } else {
        reject(new Error("파일 읽기 실패"));
      }
    };

    reader.onerror = () => {
      reject(new Error("파일 읽기 실패"));
    };

    reader.readAsText(file);
  });
};
