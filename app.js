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

function importModule(filename, args = []) {
	return `Imported file ${filename} with args ${args}`
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

	let foundExpression = true
	while (foundExpression) {
		const expressionStart = newFile.indexOf(`$(`)
		let expressionEnd = 0
		if (expressionStart < 0) break

		let parenDepth = 1
		for (let cursor = expressionStart + 2;
			cursor < newFile.length;
			cursor++) {
			if (newFile[cursor] === '(') parenDepth++
			if (newFile[cursor] === ')') parenDepth--
			if (parenDepth === 0) {
				expressionEnd = cursor + 1
				break
			}
		}

		const expression = newFile.slice(expressionStart + 2, expressionEnd - 1)
		const expressionType = expression.match(/[^\s]+/)[0]

		switch (expressionType) {
			case 'IMP':

				// Extract filename from expression
				let filename = ""
				let capturing = false
				for (let charIndex = expressionType.length;
					charIndex < expression.length;
					charIndex++) {

					const currentChar = expression[charIndex]
					if (currentChar === '"') {
						if (!capturing) {
							capturing = true
						}
						else {
							capturing = false
							break
						}
					}
					else {
						if (!capturing) continue
						filename = `${filename}${currentChar}`
					}
				}

				filename = filename.trim()

				if (!filename) {
					error(`No filename provided`)
					newFile = cutSlice(newFile, expressionStart, expressionEnd)
					continue
				}
				if (!fs.existsSync(filename)) {
					error(`File doesn't exist: ${filename}`)
					newFile = cutSlice(newFile, expressionStart, expressionEnd)
					continue
				}

				const importedFile = importModule(filename)
				newFile = replaceSlice(newFile, expressionStart, expressionEnd, importedFile)

				break
			default:
				error(`Unrecognized expression: ${expression}`)
		}

		// const variables = moduleImport[1]
		// let importedFile = fs.readFileSync(filename, 'utf8')

		// Traverse imported file and replace variables
		// let foundVariable = true
		// while (foundVariable) {
		// 	const variableStart = importedFile.indexOf('$(')
		// 	if (variableStart < 0) break
		// 	let variableEnd = 0

		// 	let parenDepth = 1
		// 	for (let cursor = variableStart + 2;
		// 		cursor < newFile.length;
		// 		cursor++) {
		// 		if (importedFile[cursor] === '(') parenDepth++
		// 		if (importedFile[cursor] === ')') parenDepth--
		// 		if (parenDepth === 0) {
		// 			variableEnd = cursor + 1
		// 			break
		// 		}
		// 	}

		// 	if (variables) {
		// 		importedFile = replaceSlice(importedFile, variableStart, variableEnd, variables[importedFile.slice(variableStart + 2, variableEnd - 1)])
		// 	}
		// 	else {
		// 		importedFile = replaceSlice(importedFile, variableStart, variableEnd, `<!-- PHTML variable ${importedFile.substring(variableStart + 2, variableEnd - 1)} not found on file:  -->`)
		// 	}
		// }
	}

	fs.writeFile(outputFile, newFile, (err) => {
		if (err) throw err
	})
}
else {
	error(`Input file is empty.`)
}