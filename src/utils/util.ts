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
  jobs: OneJobInfo[];
}

export interface ParsedLogsDict {
  //key: job name
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

export function parseJobHistory(log: string): JobInfo[] {
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
      const jobNames: string[] = [];

      jobNames.push(jobName);

      // export interface JobInfo {
      //   job_name: string;
      //   count: number;
      //   avg_time: number;
      //   jobs: OneJobInfo[];
      // }

      // export interface ParsedLogsDict {
      //   //key: job name
      //   [key: string]: JobInfo;
      // }
      // export interface OneJobInfo {
      //   job_id: string;
      //   start_time: number;
      //   end_time: number;
      //   exec_time: number;
      //   terminate_status: string;
      // }
      if (action.includes("START")) {
        // 아예 처음 jobName
        if (!parsedLogsDict[jobName]) {
          parsedLogsDict[jobName] = {
            job_name: jobName.trim(),
            count: 1,
            avg_time: 0,
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
        // 채워지지 않은, job_id가 매칭되는 정보가 jobs[]에 존재 -> 채워야 함
        const jobInfo = parsedLogsDict[jobName];
        if (jobInfo && jobInfo.jobs) {
          jobInfo.jobs.forEach((job, index) => {
            if (job.job_id === jobId && job.end_time === "") {
              parsedLogsDict[jobName].jobs[index].end_time = time;
              const startTime = parsedLogsDict[jobName].jobs[index].start_time;
              parsedLogsDict[jobName].jobs[index].exec_time =
                parseTime(startTime) - parseTime(time);
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

  for (const key in parsedLogsDict) {
    const info = parsedLogsDict[key];
    const execTimeAvg = Math.floor(
      info.jobs.reduce((sum, job) => sum + (job.exec_time || 0), 0) / info.count
    );
    parsedLogsDict[key].avg_time = execTimeAvg;
  }

  // export interface JobInfo {
  //   job_name: string;
  //   count: number;
  //   avg_time: number;
  //   jobs: OneJobInfo[];
  // }
  const sortedArray: JobInfo[] = Object.entries(parsedLogsDict)
    .map((entry) => ({
      job_name: entry[0],
      count: entry[1].count,
      jobs: entry[1].jobs,
      avg_time: entry[1].avg_time,
    }))
    .sort((a, b) => b.avg_time - a.avg_time);

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
