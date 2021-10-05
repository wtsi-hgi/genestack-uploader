# Genestack Uplaoder Development Specification

## Backend

- The backend will be a Python project, using Flask.
- The minimum version of Python supported will be 3.8.
- The entrypoint will be `app.py`, and the project **should** be split into other modules and packages as appropriate to ensure no single file is too large.
- The entire project **must** follow PEP8, for example by using `autopep8`.
- The entire project **must** have type hints throughout, checked for example by using Pylance with strict type checking.
- `# type: ignore` **must only** be used when an external package is causing issues due to incorrect/missing type hints.
- The `typing` module **should** be imported as `T`.
- The project **should** be given a virtual env, using `venv`. This **should** be called `.venv` and **must** be in a `.gitignore` file.
- A `requirements.txt` file **must** be provided.
- Functions **must** have a docstring that details:
    - what the function does in simple terms
    - all parameters, their types and what the value represents
    - return type and what it represents
    - all possible exceptions that can be raised, and a description of why it may be raised
    - any complicated data structures, such as nested dictionaries or objects, **should** have an example provided

## Frontend

*TODO*

## Docker

- A Dockerfile **must** be provided for the backend.
- If the frontend needs building, the Dockerfile **must** do this.