import * as vscode from "vscode";
import * as _ from "lodash";
import { getEnv } from "./util";
import { Env, Test, TestState, Level, Type, File } from "./extension";

interface Repo {
	levels: Level[];
	tests: Record<string, Record<string, Test>>;
}

let _repo: Repo = { levels: [], tests: {} };

async function getFiles(): Promise<Record<string, Record<string, File[]>>> {
	const courseDirectory = getEnv(Env.COURSE_DIRECTORY);
	const workspaceFiles = await vscode.workspace.findFiles(
		`${courseDirectory}/**/*`,
		`${courseDirectory}/**/{README.md,vsedu.config.json}`
	);
	const files: Record<string, Record<string, File[]>> = {};

	workspaceFiles.forEach(file => {
		const [, levelNumber, , testNumber] =
			/(\d+) ([^/]+)\/(\d+)/.exec(file.path) || [];

		if (!files[levelNumber]) {
			files[levelNumber] = {};
		}

		if (!files[levelNumber][testNumber]) {
			files[levelNumber][testNumber] = [];
		}

		files[levelNumber][testNumber].push({
			type: Type.FILE,
			name: file.path.substring(file.path.lastIndexOf("/") + 1),
			uri: file,
		});
	});

	return files;
}

export async function refresh() {
	const tests: Record<string, Record<string, Test>> = _.mapValues(
		await getFiles(),
		level => _.mapValues(level, testFiles => {
			const [, levelNumber, levelName, testNumber, testName] =
				/(\d+) ([^/]+)\/(\d+) ([^/]+)/.exec(testFiles[0].uri.path) || [];

			return {
				level: {
					type: Type.LEVEL,
					name: levelName,
					number: levelNumber
				} as Level,
				name: testName,
				number: testNumber,
				state: TestState.UNKNOWN,
				files: testFiles,
				type: Type.TEST,
			} as Test;
		})
	);
	const levels = _.uniqBy(
		Object.values(tests).flatMap(t => Object.values(t).map(u => u.level)),
		"number"
	);

	_repo = { tests, levels };
}

export function getLevels(): Level[] {
	return _repo.levels;
}

export function getTests(levelNumber: string): Test[] {
	return Object.values(_repo.tests[levelNumber]);
}
