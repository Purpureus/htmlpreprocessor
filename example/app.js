const fs = require('fs')

function print(...msg) {
	console.log(...msg)
}
function warn(...msg) {
	console.warn(...msg)
}
function error(...msg) {
	console.error(...msg)
}

function cutSlice(string, start, end) {
	return string.substring(0, start) +
		string.substring(end)
}

function replaceSlice(string, start, end, contents) {
	return string.substring(0, start) +
		contents + string.substring(end)
}

const args = process.argv.slice(2)

if (!args[0]) {
	error(`ERROR: 2 arguments expected, ${args.length} found.`)
	process.exit()
}

let outputFile = args[1]
if (!outputFile) {
	outputFile = `output.html`
}

const inputFile = args[0]
const inputData = fs.readFileSync(inputFile, 'utf8')

if (inputData) {
	const originalFile = inputData
	let newFile = originalFile

	let foundImport = true
	while (foundImport) {
		const importStart = newFile.indexOf(`$[`)
		let importEnd = 0
		if (importStart < 0) break

		let bracketDepth = 1
		for (let cursor = importStart + 2;
			cursor < newFile.length;
			cursor++) {
			if (newFile[cursor] === '[') bracketDepth++
			if (newFile[cursor] === ']') bracketDepth--
			if (bracketDepth === 0) {
				importEnd = cursor + 1
				break
			}
		}

		let moduleImport = null
		try {
			moduleImport = JSON.parse(newFile.slice(importStart + 1, importEnd))
		}
		catch (error) {
			print(`Module import failed: Invalid JSON.`)
			newFile = cutSlice(newFile, importStart, importEnd)
			continue
		}

		const filename = moduleImport[0]
		if (!filename) {
			print(`No filename provided`)
			newFile = cutSlice(newFile, importStart, importEnd)
			continue
		}

		// Check if requested file exists
		if (!fs.existsSync(filename)) {
			warn(`File doesn't exist`)
			newFile = cutSlice(newFile, importStart, importEnd)
			continue
		}

		const variables = moduleImport[1]
		let importedFile = fs.readFileSync(filename, 'utf8')

		// Traverse imported file and replace variables
		let foundVariable = true
		while (foundVariable) {
			const variableStart = importedFile.indexOf('$(')
			if (variableStart < 0) break
			let variableEnd = 0

			let parenDepth = 1
			for (let cursor = variableStart + 2;
				cursor < newFile.length;
				cursor++) {
				if (importedFile[cursor] === '(') parenDepth++
				if (importedFile[cursor] === ')') parenDepth--
				if (parenDepth === 0) {
					variableEnd = cursor + 1
					break
				}
			}

			if (variables) {
				importedFile = replaceSlice(importedFile, variableStart, variableEnd, variables[importedFile.slice(variableStart + 2, variableEnd - 1)])
			}
			else {
				importedFile = replaceSlice(importedFile, variableStart, variableEnd, `<!-- PHTML variable ${importedFile.substring(variableStart + 2, variableEnd - 1)} not found on file:  -->`)
			}
		}

		newFile = replaceSlice(newFile, importStart, importEnd, importedFile)
	}

	fs.writeFile(outputFile, newFile, (err) => {
		if (err) throw err
	})
}
else {
	print(`Input file is empty.`)
}