# UBC CampusExplorer - Sprint 0

## Basic Queries

The aim of this deliverable was to implement `src/controller/InsightFacade.ts`, based on the specification laid out below, such that it passes the test suite created as part of [deliverable 0](https://github.com/PLCoster/ubc_softdev_capstone/tree/d0). The end result is a facade class that can load in UBC Course datasets and allow flexible querying on loaded data with a flexible domain-specific query language.

In my implementation for this deliverable, additional classes were created to handle specific operations in the `InsightFacade` methods:

-   The `InsightFacade.addDataset`, `InsightFacade.removeDataset` and `InsightFacade.listDatasets` methods all utilise the `src/controller/DatasetLoader.ts` class. The `DatasetLoader` class is responsible for loading courses datasets from a given Zip file, checking if the format of the courses dataset is valid, and if it is, parsing the unzipped dataset and loading it into memory for future querying.
    -   If the dataset is valid and loaded correctly, its processed form is also cached to memory in JSON format. If it is requested to delete a dataset, this cached file is also removed.
-   The `InsightFacade.performQuery` method utilises both the `QueryParser` and `DatasetQuerier` classes in order to perform a desired query on a dataset and return the results:
    -   `src/controller/QueryParser.ts` contains the `QueryParser` class. This class takes a string query request in the EBNF given below, and processes it into an `InsightQueryAST` object to be used by the `DatasetQuerier` class. `QueryParser` uses multiple regex expressions to validate the general form of the query, and separate it into the various sections (e.g. 'Dataset', 'Kind', 'Filter', 'Display', 'Order'), with some additional validation during processing.
    -   `src/controller/DatasetQuerier.ts` contains the `DatasetQuerier` class, which takes the processed query string `InsightQueryAST` and the corresponding dataset from `DatasetLoader` and applies the query to the dataset, returning the result. For queries containing a 'FILTER' clause (analogous to an SQL 'WHERE' clause), the `InsightQueryAST.filter` property consists of a composed set of `Filter` objects (see `src/controller/filters`). Each 'row' in the courses dataset is tested against the composed filter, to remove non-matching rows. Then each data point (represented by a JS Object) has its properties renamed according to the naming convention given in the specification below (see 'Valid Keys' heading below). Finally if there was an 'ORDER' operation in the query, the array of `InsightCourseDataObjects` are sorted appropriately before being returned.

Additional test suites for `DatasetLoader` and `QueryParser` were created to ensure their correct behavior as a part of `InsightFacade`. Being a relatively simple class, `DatasetQuerier` functionality is tested using the `performQuery` tests of the `InsightFacade` test suite.

## Specification

### Courses Datasets

This data has been obtained from UBC PAIR and has not been modified in any way. The data is provided as a zip file: inside of the zip you will find a file for each of the courses offered at UBC. Each of those file is a comma-separated values (CSV) file containing the information about each offering of the course.

The dataset zip file can be found here: [sdmm.courses.1.0.zip](https://github.com/SECapstone/capstone/blob/master/sdmm.courses.1.0.zip)

**Checking the validity of the dataset:**

-   A valid dataset has to be a valid zip file; this zip will contain many files under a folder called `courses/`.
-   Valid courses will always be in CSV format.
-   Each CSV file represents a course and can contain zero or more course sections.
-   A valid dataset has to contain at least one valid course section that meets the requirements above.

**Reading and Parsing the Dataset:**

You will need to parse valid input files into internal objects or other data structures. You are not allowed to store the data in a database. You must also persist (cache) the model to disk for quicker access. Do not commit this cached file to version control, or AutoTest will fail in unpredictable ways.

There is a provided package called JSZip that you should use to process/unzip the data you are passed in your addDataset method (described below).

### Query ENBF

The goal of the deliverable is to build the backend to reply to query about the dataset. The query will be based on the EBNF described below.

_Note: this [EBNF](https://en.wikipedia.org/wiki/Extended_Backus%E2%80%93Naur_Form) is not complete and will be extended in future deliverables_

```
QUERY   ::= DATASET + ', ' + FILTER + '; ' + DISPLAY(+ '; ' + ORDER)? + '.'
DATASET ::= 'In ' + KIND + ' dataset ' + INPUT
FILTER  ::= 'find all entries' || 'find entries whose ' + (CRITERIA || (CRITERIA + ((' and ' || ' or ') + CRITERIA)*)
DISPLAY ::= 'show ' + KEY (+ MORE_KEYS)?
ORDER   ::= 'sort in ascending order by ' + KEY

CRITERIA   ::= M_CRITERIA || S_CRITERIA
M_CRITERIA ::= M_KEY + M_OP + NUMBER
S_CRITERIA ::= S_KEY + S_OP + STRING

NUMBER   ::= ('-')? + [0-9] (+ [0-9])* + ('.' + [0-9] (+ [0-9])*)?
STRING   ::= '"' + [^*"]* + '"' // any string without * or " in it, enclosed by double quotation marks

RESERVED ::= KEYWORD || M_OP || S_OP
KEYWORD  ::= 'In' || 'dataset' || 'find' || 'all' || 'show' || 'and' || 'or' || 'sort' || 'by' || 'entries' || 'is' || 'the' || 'of' || 'whose'
M_OP     ::= 'is ' + ('not ' +)? ('greater than ' || 'less than ' || 'equal to ')S_OP     ::= ('is ' (+ 'not ')?) || 'includes ' || 'does not include ' || (('begins' || 'does not begin' || 'ends' || 'does not end') + ' with ')
KIND     ::= 'courses'

INPUT    ::= string of one or more characters. Cannot contain spaces, underscores or equal to RESERVED strings

KEY   ::= M_KEY || S_KEY
MORE_KEYS   ::= ((', ' + KEY +)* ' and ' + KEY)
M_KEY ::= 'Average' || 'Pass' || 'Fail' || 'Audit'
S_KEY ::= 'Department' || 'ID' || 'Instructor' || 'Title' || 'UUID'
```

**Syntactic Checking (Parsing):**

Your query engine must test the validity of input queries against the grammar. It must then store the query in a structure (related objects, objects in an AST, or other data structure of your choice) such that you can perform the query as indicated by the semantics below. The hierarchy of that structure should likely match that of the incoming CSV.

Error responses for failed parsing are provided below in the specification for the `performQuery` method

**Semantic Checking:**

Semantic checks are typically performed on the existing (validated) AST. Type checking is an example of a semantic check. In this project you must perform the following semantic check:

`'ORDER': key` where key (a string) is the column name to sort on; the key must be in the COLUMNS array or the query is invalid

### Valid Keys

In order to maintain readability of the queries, you are not allowed to use the key contained in data. Rather, you will have to build a vocabulary that will translate the keys in the query to the keys that you will use to query and return the data.

Valid keys are composed by two parts, separated by an underscore: `<id>_<key>`

-   `<id>` is provided by the user and will be received through the `addDataset()` method, check the API spec to better understand how it should work.
-   `<key>` is the key that represents a given piece of information. For this deliverable you will parse the following keys: `dept`, `id`, `instructor`, `title`, `pass`, `fail`, `audit`, `uuid`, and `avg`.

For instance, if the `id` sent by the user is `courses`, then the queries you will run will be using the following keys:

-   courses_dept: `string`; The department that offered the course.
-   courses_id: `string`; The course number (will be treated as a string (e.g., 499b)).
-   courses_avg: `number`; The average of the course offering.
-   courses_instructor: `string`; The instructor teaching the course offering.
-   courses_title: `string`; The name of the course.
-   courses_pass: `number`; The number of students that passed the course offering.
-   courses_fail: `number`; The number of students that failed the course offering.
-   courses_audit: `number`; The number of students that audited the course offering.
-   courses_uuid: `string`; The unique id of a course offering.

Note: these keys are different than the ones present in the raw data. Since you are not allowed to modify the data, you will have to come up with a way to translate them.

### Example Queries

Query 1:

```
In courses dataset courses, find entries whose Average is greater than 97; show Department and Average; sort in ascending order by Average.
```

Expected Result:

```
{ result:
       [ { courses_dept: 'epse', courses_avg: 97.09 },
         { courses_dept: 'math', courses_avg: 97.09 },
         { courses_dept: 'math', courses_avg: 97.09 },
         { courses_dept: 'epse', courses_avg: 97.09 },
         { courses_dept: 'math', courses_avg: 97.25 },
         { courses_dept: 'math', courses_avg: 97.25 },
         { courses_dept: 'epse', courses_avg: 97.29 },
         { courses_dept: 'epse', courses_avg: 97.29 },
         { courses_dept: 'nurs', courses_avg: 97.33 },
         { courses_dept: 'nurs', courses_avg: 97.33 },
         { courses_dept: 'epse', courses_avg: 97.41 },
         { courses_dept: 'epse', courses_avg: 97.41 },
         { courses_dept: 'cnps', courses_avg: 97.47 },
         { courses_dept: 'cnps', courses_avg: 97.47 },
         { courses_dept: 'math', courses_avg: 97.48 },
         { courses_dept: 'math', courses_avg: 97.48 },
         { courses_dept: 'educ', courses_avg: 97.5 },
         { courses_dept: 'nurs', courses_avg: 97.53 },
         { courses_dept: 'nurs', courses_avg: 97.53 },
         { courses_dept: 'epse', courses_avg: 97.67 },
         { courses_dept: 'epse', courses_avg: 97.69 },
         { courses_dept: 'epse', courses_avg: 97.78 },
         { courses_dept: 'crwr', courses_avg: 98 },
         { courses_dept: 'crwr', courses_avg: 98 },
         { courses_dept: 'epse', courses_avg: 98.08 },
         { courses_dept: 'nurs', courses_avg: 98.21 },
         { courses_dept: 'nurs', courses_avg: 98.21 },
         { courses_dept: 'epse', courses_avg: 98.36 },
         { courses_dept: 'epse', courses_avg: 98.45 },
         { courses_dept: 'epse', courses_avg: 98.45 },
         { courses_dept: 'nurs', courses_avg: 98.5 },
         { courses_dept: 'nurs', courses_avg: 98.5 },
         { courses_dept: 'epse', courses_avg: 98.58 },
         { courses_dept: 'nurs', courses_avg: 98.58 },
         { courses_dept: 'nurs', courses_avg: 98.58 },
         { courses_dept: 'epse', courses_avg: 98.58 },
         { courses_dept: 'epse', courses_avg: 98.7 },
         { courses_dept: 'nurs', courses_avg: 98.71 },
         { courses_dept: 'nurs', courses_avg: 98.71 },
         { courses_dept: 'eece', courses_avg: 98.75 },
         { courses_dept: 'eece', courses_avg: 98.75 },
         { courses_dept: 'epse', courses_avg: 98.76 },
         { courses_dept: 'epse', courses_avg: 98.76 },
         { courses_dept: 'epse', courses_avg: 98.8 },
         { courses_dept: 'spph', courses_avg: 98.98 },
         { courses_dept: 'spph', courses_avg: 98.98 },
         { courses_dept: 'cnps', courses_avg: 99.19 },
         { courses_dept: 'math', courses_avg: 99.78 },
         { courses_dept: 'math', courses_avg: 99.78 } ] }
```

Query 2:

```
In courses dataset courses, find entries whose Average is greater than 90 and Department is \"adhe\" or Average is equal to 95; show Department, ID and Average; sort in ascending order by Average.
```

Expected Result:

```
{ result:
       [ { courses_dept: 'adhe', courses_id: '329', courses_avg: 90.02 },
         { courses_dept: 'adhe', courses_id: '412', courses_avg: 90.16 },
         { courses_dept: 'adhe', courses_id: '330', courses_avg: 90.17 },
         { courses_dept: 'adhe', courses_id: '412', courses_avg: 90.18 },
         { courses_dept: 'adhe', courses_id: '330', courses_avg: 90.5 },
         { courses_dept: 'adhe', courses_id: '330', courses_avg: 90.72 },
         { courses_dept: 'adhe', courses_id: '329', courses_avg: 90.82 },
         { courses_dept: 'adhe', courses_id: '330', courses_avg: 90.85 },
         { courses_dept: 'adhe', courses_id: '330', courses_avg: 91.29 },
         { courses_dept: 'adhe', courses_id: '330', courses_avg: 91.33 },
         { courses_dept: 'adhe', courses_id: '330', courses_avg: 91.33 },
         { courses_dept: 'adhe', courses_id: '330', courses_avg: 91.48 },
         { courses_dept: 'adhe', courses_id: '329', courses_avg: 92.54 },
         { courses_dept: 'adhe', courses_id: '329', courses_avg: 93.33 },
         { courses_dept: 'rhsc', courses_id: '501', courses_avg: 95 },
         { courses_dept: 'bmeg', courses_id: '597', courses_avg: 95 },
         { courses_dept: 'bmeg', courses_id: '597', courses_avg: 95 },
         { courses_dept: 'cnps', courses_id: '535', courses_avg: 95 },
         { courses_dept: 'cnps', courses_id: '535', courses_avg: 95 },
         { courses_dept: 'cpsc', courses_id: '589', courses_avg: 95 },
         { courses_dept: 'cpsc', courses_id: '589', courses_avg: 95 },
         { courses_dept: 'crwr', courses_id: '599', courses_avg: 95 },
         { courses_dept: 'crwr', courses_id: '599', courses_avg: 95 },
         { courses_dept: 'crwr', courses_id: '599', courses_avg: 95 },
         { courses_dept: 'crwr', courses_id: '599', courses_avg: 95 },
         { courses_dept: 'crwr', courses_id: '599', courses_avg: 95 },
         { courses_dept: 'crwr', courses_id: '599', courses_avg: 95 },
         { courses_dept: 'crwr', courses_id: '599', courses_avg: 95 },
         { courses_dept: 'sowk', courses_id: '570', courses_avg: 95 },
         { courses_dept: 'econ', courses_id: '516', courses_avg: 95 },
         { courses_dept: 'edcp', courses_id: '473', courses_avg: 95 },
         { courses_dept: 'edcp', courses_id: '473', courses_avg: 95 },
         { courses_dept: 'epse', courses_id: '606', courses_avg: 95 },
         { courses_dept: 'epse', courses_id: '682', courses_avg: 95 },
         { courses_dept: 'epse', courses_id: '682', courses_avg: 95 },
         { courses_dept: 'kin', courses_id: '499', courses_avg: 95 },
         { courses_dept: 'kin', courses_id: '500', courses_avg: 95 },
         { courses_dept: 'kin', courses_id: '500', courses_avg: 95 },
         { courses_dept: 'math', courses_id: '532', courses_avg: 95 },
         { courses_dept: 'math', courses_id: '532', courses_avg: 95 },
         { courses_dept: 'mtrl', courses_id: '564', courses_avg: 95 },
         { courses_dept: 'mtrl', courses_id: '564', courses_avg: 95 },
         { courses_dept: 'mtrl', courses_id: '599', courses_avg: 95 },
         { courses_dept: 'musc', courses_id: '553', courses_avg: 95 },
         { courses_dept: 'musc', courses_id: '553', courses_avg: 95 },
         { courses_dept: 'musc', courses_id: '553', courses_avg: 95 },
         { courses_dept: 'musc', courses_id: '553', courses_avg: 95 },
         { courses_dept: 'musc', courses_id: '553', courses_avg: 95 },
         { courses_dept: 'musc', courses_id: '553', courses_avg: 95 },
         { courses_dept: 'nurs', courses_id: '424', courses_avg: 95 },
         { courses_dept: 'nurs', courses_id: '424', courses_avg: 95 },
         { courses_dept: 'obst', courses_id: '549', courses_avg: 95 },
         { courses_dept: 'psyc', courses_id: '501', courses_avg: 95 },
         { courses_dept: 'psyc', courses_id: '501', courses_avg: 95 },
         { courses_dept: 'econ', courses_id: '516', courses_avg: 95 },
         { courses_dept: 'adhe', courses_id: '329', courses_avg: 96.11 } ] }
```

## Local Setup / Usage

## Configuring your environment

To start using this repository, you need to get your computer configured so you can build and execute the code. To do this, follow these steps; the specifics of each step (especially the first two) will vary based on which operating system your computer has:

1. Install git (you should be able to execute `git --version` on the command line).

1. Install Node (version 14.16.X), which will also install NPM (you should be able to execute `node --version` and `npm --version` on the command line).

1. [Install Yarn](https://yarnpkg.com/en/docs/install). You should be able to execute `yarn --version` afterwards.

1. Clone the project on [https://github.com/secapstone](https://github.com/secapstone). You can find your team ID and clone the repo by visiting your project in GitHub and getting the clone target by clicking on the green button on your project repository.

## Project commands

Once your environment is configured you need to further prepare the project's tooling and dependencies. In the project folder:

1. `yarn clean` (or `yarn cleanwin` if you are using Windows) to delete your project's _node_modules_ directory.

1. `yarn install` to download the packages specified in your project's _package.json_ to the _node_modules_ directory.

1. `yarn build` to compile your project. You must run this command after making changes to your TypeScript files.

1. `yarn test` to run the test suite.
