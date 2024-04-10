/*
Copyright 2022 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

/**
 * This nodejs script is intended as helper utility script to transform the YAML config file to JSON.
 * It is indtended to be used as build helper by extension projects that have app config files in YAML format.
 * If config file path not provided, this will assume config in project root at "<project root>/app.config.yaml"
 * 
 * This script does following things:
 *   1. Convert YAML to JSON
 *   2. Transform JSON to metadata format
 *   3. Validate JSON against schema
 *   4. Write JSON to file
 */

const yaml = require("js-yaml");
const fs = require("fs");
const path = require("path");
const Ajv = require("ajv");
const ajv = new Ajv();

console.log("file: ", fs.readFileSync(
  "app.config.yaml"
));

const metadataSchema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "Generated schema for Root",
  type: "object",
  properties: {
    extensions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          extensionPoint: {
            type: "string",
          },
          url: {
            type: "string",
          },
        },
        required: ["extensionPoint"],
      },
    },
  },
  required: ["extensions"],
};

function transformConfigToMetadata(configJson) {
  const extensions = [];

  for (let [key, value] of Object.entries(configJson.extensions)) {
    extensions.push({
      extensionPoint: key,
      url: value?.operations?.view?.[0]?.impl,
    });
  }

  // Transform the data here
  const transformedData = {
    extensions,
  };
  return transformedData;
}

function validateSchema(metadataJson) {
  const validate = ajv.compile(metadataSchema);
  const valid = validate(metadataJson);
  if (!valid)
    throw new Error(
      "Metadata schema validation failed" +
        JSON.stringify(validate.errors, null, 4)
    );
}

function generateAppMetadata(appConfigFilePath) {
  let outputMetadataJson = {};



  const appConfigPath = appConfigFilePath || generateAppConfigFilePath();

  try {
    const appConfigYaml = fs.readFileSync(appConfigPath);
    const appConfigJson = yaml.load(appConfigYaml, {});
    const result = transformConfigToMetadata(appConfigJson);
    validateSchema(result);

    //metadata is valid
    outputMetadataJson = result;
  } catch (message) {
    console.error(
      "Error transforming app.config.yaml to metadata. Metadata will not be available: ",
      message
    );
  }

  //write to file: valid metadata -or- empty object, incase validation fails
  fs.writeFileSync(
    "src/app-metadata.json",
    JSON.stringify(outputMetadataJson, null, 4)
  );

  console.info("App metadata generated successfully");
}

function generateAppConfigFilePath(){
  // Get the directory of the current module file
  const currentDir = __dirname;

  console.log(`Current directory: ${currentDir}`);

  // Navigate up to the project root
  const projectRoot = path.resolve(currentDir, '../../../../');

  console.log(`Project root: ${projectRoot}`);

  return path.resolve(projectRoot, 'app.config.yaml');
}

generateAppMetadata();

module.exports = {
  generateAppMetadata
}
