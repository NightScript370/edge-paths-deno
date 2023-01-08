import { join } from "https://deno.land/std@0.171.0/path/mod.ts"

let platform = Deno.build

// Caller will ensure that the platform is linux, otherwise null will be returned
async function getEdgeLinux(
	name:
		| "microsoft-edge-dev"
		| "microsoft-edge-beta"
		| "microsoft-edge-stable",
): string | null {
	try {
		let path = await new Command('which', { args: [name] }).output()
		return path
	} catch (e) {}

	return null
}


// Caller will ensure that the platform is windows, otherwise null will be returned
async function getEdgeWindows(
	edgeDirName: "Edge" | "Edge Dev" | "Edge Beta" | "Edge SxS",
): string | null {
	let paths = []
	let suffix = `\\Microsoft\\${edgeDirName}\\Application\\msedge.exe`
	let prefixes = [
		'LOCALAPPDATA',
		'PROGRAMFILES',
		"PROGRAMFILES(X86)",
	].map(string => Deno.env.get(string)).filter(Boolean)

	for (let prefix of prefixes) {
		let edgePath = join(prefix!, suffix)
		paths.push(edgePath)
		if (async exists(edgePath)) {
			return edgePath
		}
	}

	return null
}

// Caller will ensure that the platform is macos, otherwise null will be returned
async function getEdgeDarwin(defaultPath: string): string | null {
	if (await exists(defaultPath)) {
		return defaultPath
	}

	return null
}

const edgePaths = {
	edge: {
		linux: async () => await getEdgeLinux("microsoft-edge-stable"),
		darwin: async () =>
			await getEdgeDarwin(
				"/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
			),
		windows: async () => await getEdgeWindows("Edge"),
	},
	dev: {
		linux: async () => await getEdgeLinux("microsoft-edge-dev"),
		darwin: async () =>
			await getEdgeDarwin(
				"/Applications/Microsoft Edge Dev.app/Contents/MacOS/Microsoft Edge Dev",
			),
		windows: async () => await getEdgeWindows("Edge Dev"),
	},
	beta: {
		linux: async () => await getEdgeLinux("microsoft-edge-beta"),
		darwin: async () =>
			await getEdgeDarwin(
				"/Applications/Microsoft Edge Beta.app/Contents/MacOS/Microsoft Edge Beta",
			),
		windows: async () => await getEdgeWindows("Edge Beta"),
	},
	canary: {
		// linux: getEdgeLinux("microsoft-edge-beta"),
		darwin: async () =>
			await getEdgeDarwin(
				"/Applications/Microsoft Edge Canary.app/Contents/MacOS/Microsoft Edge Canary",
			),
		windows: async () => await getEdgeWindows("Edge SxS"),
	},
}

// returns edge path
export async function getEdgePath(): string {
	let edge = edgePaths.edge

	if (platform && platform in edgePaths.edge) {
		let pth = await edge[platform as keyof typeof edge]()
		if (pth) {
			return pth
		}
	}
	throwInvalidPlatformError("Edge Stable", edgePaths)
}

// Returns edge dev path
export async function getEdgeDevPath(): string {
	let edgeDev = edgePaths.dev

	if (platform && platform in edgeDev) {
		let pth = await edgeDev[platform as keyof typeof edgeDev]()
		if (pth) {
			return pth
		}
	}
	throwInvalidPlatformError("Edge Dev", edgePaths)
}

// Returns edge beta path if it is available
export async function getEdgeBetaPath(): string {
	let edgeBeta = edgePaths.beta

	if (platform && platform in edgeBeta) {
		let pth = await edgeBeta[platform as keyof typeof edgeBeta]()
		if (pth) {
			return pth
		}
	}
	throwInvalidPlatformError("Edge Beta", edgePaths)
}

// Returns edge canary paths.
export async function getEdgeCanaryPath(): string {
	let edgeCanary = edgePaths.canary

	if (platform && platform in edgeCanary) {
		let pth = await edgeCanary[platform as keyof typeof edgeCanary]()
		if (pth) {
			return pth
		}
	}
	throwInvalidPlatformError("Edge Canary", edgePaths)
}

// This will try to get any edge from bleeding edge to most stable version
export async function getAnyEdgeLatest(): string {
	try {
		return await getEdgeCanaryPath()
	} catch (e) {
		throwIfNotEdgePathIssue(e)
	}

	try {
		return await getEdgeDevPath()
	} catch (e) {
		throwIfNotEdgePathIssue(e)
	}

	try {
		return await getEdgeBetaPath()
	} catch (e) {
		throwIfNotEdgePathIssue(e)
	}

	try {
		return await getEdgePath()
	} catch (e) {
		throwIfNotEdgePathIssue(e)
	}

	throw {
		name: "edge-paths",
		message: `Unable to find any ms-edge-browser`,
	}
}

// This will try to get edge from stable version to bleeding version
// Useful for playwright, puppeteer related stuff
export async function getAnyEdgeStable(): string {
	try {
		return await getEdgePath()
	} catch (e) {
		throwIfNotEdgePathIssue(e)
	}

	try {
		return await getEdgeBetaPath()
	} catch (e) {
		throwIfNotEdgePathIssue(e)
	}

	try {
		return await getEdgeDevPath()
	} catch (e) {
		throwIfNotEdgePathIssue(e)
	}

	try {
		return await getEdgeCanaryPath()
	} catch (e) {
		throwIfNotEdgePathIssue(e)
	}

	throw {
		name: "edge-paths",
		message: `Unable to find any ms-edge-browser.`,
	}
}

// Helpers
function throwInvalidPlatformError(
	additionalInfo: string = "",
	otherDetails?: any,
): never {
	throw {
		name: "edge-paths",
		message: `Couldn't find the edge browser. ${additionalInfo}`,
		additionalInfo,
		otherDetails,
	}
}

function throwIfNotEdgePathIssue(obj: any) {
	if (
		Object.prototype.toString.call(obj) === "[object Object]" &&
		obj &&
		obj.name &&
		obj.name === "edge-paths"
	) {
		return
	}

	throw obj
}

async function exists (filename: string): Promise<boolean> {
	try {
		await Deno.stat(filename);
		// successful, file or directory must exist
		return true;
	} catch (error) {
		if (error instanceof Deno.errors.NotFound) {
			// file or directory does not exist
			return false;
		} else {
			// unexpected error, maybe permissions, pass it along
			throw error;
		}
	}
}
