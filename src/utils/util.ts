export interface TsData {
  start_time: string;
  end_time?: string;
  exec_time?: number;
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

export interface OneJobInfo {
  job_id: string;
  start_time: string;
  end_time: string;
  exec_time: number;
  terminate_status: string;
}
export interface JobInfo {
  job_name: string;
  count: number;
  avg_time: number;
  time_interval: number[];
  jobs: OneJobInfo[];
}

export interface ParsedLogsDict {
  //key: job name
  [key: string]: JobInfo;
}

/**
 * Parses the time string into milliseconds.
 * @param timeStr - The time string in the format '(-)XmYsZms' where X is minutes, Y is seconds, and Z is milliseconds.
 * @returns The time in milliseconds with sign.
 * @throws Error if the time format is invalid.
 */
function parseTime(timeStr: string): number {
  const match = timeStr.match(/(-)?(?:(\d+)m)?(?:(\d+)s)?(?:(\d+)ms)?/);
  if (match) {
    const sign = match[1] ? -1 : 1;
    const [_, __, minutes, seconds, milliseconds] = match.map((x) =>
      x ? parseInt(x) : 0
    );
    const totalMilliseconds =
      sign *
      (Math.abs(minutes) * 60 +
        Math.abs(seconds) +
        Math.abs(milliseconds) / 1000) *
      1000;
    return totalMilliseconds;
  } else {
    throw new Error("Invalid time format");
  }
}

/**
 * Parses the job schedule log and extracts relevant information.
 * @param log - The log string containing job schedule information.
 * @returns An array of JobScheduleInfo objects sorted by package count.
 */
export function parseJobSchedule(log: string): JobScheduleInfo[] {
  const match = log.match(/Registered \d+ jobs:(.+?)ConnectivityController:/s);
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
      const requiredConstraints = requiredConstraintsMatch
        ? requiredConstraintsMatch[1].trim()
        : null;
      const restrictReason = restrictReasonMatch
        ? restrictReasonMatch[1].trim()
        : null;

      if (packageName && !packageLogs[packageName]) {
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
        packageLogs[packageName].count++;
        packageLogs[packageName].jobs.push({
          package_name: packageName,
          job_number: jobNumber,
          job_name: jobName,
          required_constraints: requiredConstraints,
          restrict_reason: restrictReason,
        });
      }
    }
  }
  const sortedArray = Object.entries(packageLogs);
  sortedArray.sort((a, b) => b[1].count - a[1].count);
  const sortedJobArray: JobScheduleInfo[] = sortedArray
    .map((entry) => entry[1].jobs)
    .flat();

  return sortedJobArray;
}

/**
 * Parses the job history log and extracts relevant information.
 * @param log - The log string containing job history information.
 * @returns An array of JobInfo objects sorted by average execution time.
 */
export function parseJobHistory(log: string): JobInfo[] {
  const startIdx = log.indexOf("Job history:");
  const endIdx = log.indexOf("Pending queue:");

  const jobHistoryLog = log.substring(startIdx, endIdx).trim();
  const lines = jobHistoryLog.split("\n").slice(1);
  const parsedLogsDict: ParsedLogsDict = {};

  for (const line of lines) {
    const match = line.match(
      /(-[\dms]+)\s+(START(?:-P)?|STOP(?:-P)?): (#\S+)\s+(.+?)(?:\s+(.+))?$/
    );

    if (match) {
      const [, time, action, jobId, jobName, terminateStatus] = match;
      const jobNames: string[] = [];

      jobNames.push(jobName);

      if (action.includes("START")) {
        // If new job name encountered
        if (!parsedLogsDict[jobName]) {
          parsedLogsDict[jobName] = {
            job_name: jobName.trim(),
            count: 1,
            avg_time: 0,
            time_interval: [],
            jobs: [
              {
                job_id: jobId,
                start_time: time,
                end_time: "",
                exec_time: 0,
                terminate_status: "",
              },
            ],
          };
        } else {
          parsedLogsDict[jobName].count += 1;
          parsedLogsDict[jobName].jobs.push({
            job_id: jobId,
            start_time: time,
            end_time: "",
            exec_time: 0,
            terminate_status: "",
          });
        }
      } else if (action.includes("STOP")) {
        // calculate end time, exec time, terminate status
        const jobInfo = parsedLogsDict[jobName];
        if (jobInfo && jobInfo.jobs) {
          jobInfo.jobs.forEach((job, index) => {
            if (job.job_id === jobId && job.end_time === "") {
              parsedLogsDict[jobName].jobs[index].end_time = time;
              const startTime = parsedLogsDict[jobName].jobs[index].start_time;
              parsedLogsDict[jobName].jobs[index].exec_time =
                parseTime(time) - parseTime(startTime);

              parsedLogsDict[jobName].jobs[index].terminate_status =
                terminateStatus;
            }
          });
        } else {
          console.log(`error: job ${jobId} hasn't started`);
        }
      }
    } else {
      console.log(`${line} not matched!`);
    }
  }

  // Calculate Exec Time
  for (const key in parsedLogsDict) {
    const info = parsedLogsDict[key];
    const execTimeAvg = Math.floor(
      info.jobs.reduce((sum, job) => sum + (job.exec_time || 0), 0) / info.count
    );
    parsedLogsDict[key].avg_time = execTimeAvg;
  }

  // Calculate Time Interval
  for (const key in parsedLogsDict) {
    const info = parsedLogsDict[key];
    info.jobs.sort((a, b) => parseTime(a.start_time) - parseTime(b.start_time));
    info.jobs.forEach((job, index) => {
      if (index < info.jobs.length - 1) {
        parsedLogsDict[key].time_interval.push(
          Math.floor(
            parseTime(info.jobs[index + 1].start_time) -
              parseTime(info.jobs[index].start_time)
          )
        );
      }
    });
  }

  const sortedArray: JobInfo[] = Object.entries(parsedLogsDict)
    .map((entry) => ({
      job_name: entry[0],
      count: entry[1].count,
      jobs: entry[1].jobs,
      time_interval: entry[1].time_interval,
      avg_time: entry[1].avg_time,
    }))
    .sort((a, b) => b.avg_time - a.avg_time);

  return sortedArray;
}

/**
 * Reads the content of a file asynchronously.
 * @param file - The file to read.
 * @returns A promise resolving to the content of the file as a string.
 */
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
