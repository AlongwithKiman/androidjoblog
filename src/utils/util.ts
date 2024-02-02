export interface TsData {
  start_time: string;
  end_time?: string;
  exec_time?: number;
}

export interface JobInfo {
  job_name: string;
  count: number;
  ts: TsData[];
  avg_time: number;
}

export interface JobScheduleInfo {
  package_name: string | null;
  job_number: string | null;
  job_name: string | null;
  required_constraints: string | null;
  restrict_reason: string | null;
}

export interface PackageInfo {
  package_name: string | null;
  count: number;
  jobs: JobScheduleInfo[];
}

export interface PackageDict {
  [key: string]: {
    jobs: JobScheduleInfo[];
    count: number;
  };
}

export interface JobHistoryInfo {
  job_number: string;
  job_name: string;
  count: number;
  ts: TsData[];
  avg_time: number;
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
  // const match = log.match(/Registered \d+ jobs:(.+)/s);
  const match = log.match(/Registered \d+ jobs:(.+?)ConnectivityController:/s);
  // const parsedLogs: JobScheduleInfo[] = [];
  const packageLogs: PackageDict = {};

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
      const packageName = jobName ? jobName.split("/")[0] : null;
      console.log(packageName);
      const requiredConstraints = requiredConstraintsMatch
        ? requiredConstraintsMatch[1].trim()
        : null;
      const restrictReason = restrictReasonMatch
        ? restrictReasonMatch[1].trim()
        : null;

      // parsedLogs.push({
      //   job_number: jobNumber,
      //   package_name: packageName,
      //   job_name: jobName,
      //   required_constraints: requiredConstraints,
      //   restrict_reason: restrictReason,
      // });
      if (packageName && !packageLogs[packageName]) {
        // If the package_name is not present in the dictionary, add a new entry
        packageLogs[packageName] = {
          jobs: [
            {
              package_name: packageName,
              job_number: jobNumber,
              job_name: jobName,
              required_constraints: requiredConstraints,
              restrict_reason: restrictReason,
            },
          ],
          count: 1,
        };
      } else if (packageName && packageLogs[packageName]) {
        // If the package_name is already present, increment count
        packageLogs[packageName].count++;
        packageLogs[packageName].jobs.push({
          package_name: packageName,
          job_number: jobNumber,
          job_name: jobName,
          required_constraints: requiredConstraints,
          restrict_reason: restrictReason,
        });
      }

      // Push the current jobLog to the jobs array
    }
  }
  const sortedArray = Object.entries(packageLogs);
  sortedArray.sort((a, b) => b[1].count - a[1].count);
  const sortedJobArray: JobScheduleInfo[] = sortedArray
    .map((entry) => entry[1].jobs)
    .flat();

  console.log("sorted array:");
  console.log(sortedJobArray);
  return sortedJobArray;
}

export function parseJobHistory(log: string): JobHistoryInfo[] {
  const startIdx = log.indexOf("Job history:");
  const endIdx = log.indexOf("Pending queue:");

  const jobHistoryLog = log.substring(startIdx, endIdx).trim();
  const lines = jobHistoryLog.split("\n").slice(1);
  const parsedLogsDict: ParsedLogsDict = {};

  for (const line of lines) {
    const match = line.match(
      /-([\dms]+)\s+(START(?:-P)?|STOP(?:-P)?): (#\S+)\s+(.+?)(?:\s+(.+))?$/
    );

    if (match) {
      const [, time, action, jobId, jobName, finishInfo] = match;
      const ids: string[] = [];

      ids.push(jobId);

      if (action.includes("START")) {
        if (!parsedLogsDict[jobId]) {
          parsedLogsDict[jobId] = {
            job_name: jobName.trim(),
            count: 1,
            ts: [{ start_time: time }],
            avg_time: 0,
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

      // console.log(`index ${line} registered`);
    } else {
      // console.log(`${line} not matched!`);
    }
  }

  for (const key in parsedLogsDict) {
    const info = parsedLogsDict[key];
    const execTimeAvg = Math.floor(
      info.ts.reduce((sum, ts) => sum + (ts.exec_time || 0), 0) / info.ts.length
    );
    parsedLogsDict[key].avg_time = execTimeAvg;
  }

  const sortedArray: JobHistoryInfo[] = Object.entries(parsedLogsDict)
    .map((entry) => ({
      job_number: entry[0],
      job_name: entry[1].job_name,
      count: entry[1].count,
      ts: entry[1].ts,
      avg_time: entry[1].avg_time,
    }))
    .sort((a, b) => a.avg_time - b.avg_time);

  return sortedArray;
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
