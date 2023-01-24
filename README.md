# UBC CampusExplorer - Sprint 0

## Black-Box Testing

The aim of this deliverable was to read the specification for `src/controller/InsightFacade.ts` and then (following the practice of Test-driven development), write a comprehensive test based on this specification. Specifically, the tests must cover the `addDataset`, `removeDataset`, `performQuery` and `listDatasets` methods of the `InsightFacade` interface (`src/controller/IInsightFacade.ts`).

As there is no implementation for InsightFacade, all these tests will fail (RED-GREEN-REFACTOR). Instead the created tests were run against an automated test suite to ensure good coverage and correct expected behavior from the tests created. All the tests added are written in `test/InsightFacade.spec.ts`, with added queries to test `InsightFacade.performQuery` in `test/queries`.

## Specification

### Overview:

The API is comprised of three interfaces. You must not change the interface specifications.

-   `InsightResponse` is the interface for the objects your methods will fulfill with.
-   `IInsightFacade` is the front end (wrapper) for the query engine. In practice, it defines the endpoints for the deliverable. It provides several methods:
    -   `addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<InsightResponse>` adds a dataset to the internal model, providing the id of the dataset, the string of the content of the dataset, and the kind of the dataset. For this deliverable the dataset kind will be *courses*.
    -   `removeDataset(id: string): Promise<InsightResponse>` removes a dataset from the internal model, given the id.
    -   `performQuery(query: any): Promise<InsightResponse>` performs a query on the dataset. It first should parse and validate the input query, then perform semantic checks on the query, and finally evaluate the query if it is valid.
    -   `listDatasets(): Promise<InsightResponse>` returns InsightResponse containing the list of added datasets. This list contains the id, kind, and number of rows of each added dataset.

### Query EBNF

String queries sent to the `performQuery` method must follow the [EBNF](https://en.wikipedia.org/wiki/Extended_Backus%E2%80%93Naur_Form) given below. Note that ths EBNF is not complete and will be extended in future deliverables.

```
QUERY ::= DATASET + ', ' + FILTER + '; ' + DISPLAY(+ '; ' + ORDER)? + '.'
DATASET ::= 'In ' + KIND + ' dataset ' + INPUT
FILTER ::= 'find all entries' || 'find entries whose ' + (CRITERIA || (CRITERIA + ((' and ' || ' or ') + CRITERIA)\*)
DISPLAY ::= 'show ' + KEY (+ MORE_KEYS)?
ORDER ::= 'sort in ascending order by ' + KEY

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

### Syntactic Checking (Parsing)

Your query engine must test the validity of input queries against the grammar. It must then store the query in a structure (related objects, objects in an AST, or other data structure of your choice) such that you can perform the query as indicated by the semantics below. The hierarchy of that structure should likely match that of the incoming CSV.

Error responses for failed parsing are provided below in the specification for the `performQuery` method

### Semantic Checking

Semantic checks are typically performed on the existing (validated) AST. Type checking is an example of a semantic check. In this project you must perform the following semantic check:

`'ORDER': key` where key (a string) is the column name to sort on; the key must be in the COLUMNS array or the query is invalid

### Valid keys

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
