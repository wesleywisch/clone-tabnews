const dotenv = require('dotenv')
const path = require('path')
dotenv.config({ path: path.resolve(__dirname, '.env.development') })

const nextJest = require('next/jest')

const createJestConfig = nextJest()
const jestConfig = createJestConfig({
  moduleDirectories: ['node_modules', '<rootDir>']
});

module.exports = jestConfig