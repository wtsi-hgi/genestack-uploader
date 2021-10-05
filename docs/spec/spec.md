# Genestack Uploader Specification

To help make uploading data to Genestack, Emre has created a Python package (`sanger internal gitlab/hgi-projects/uploadtogenestack`) to automate parts of the process. We now want a HTTP server to host an interface for this.

## Backend

- The HTTP server will host both an API and the pages. 
- Pages **must not** be under `/api/` as that will be where the API endpoints are hosted.
- Any endpoint without a handler **must** return a 404 Not Found HTTP code, and **should** return helpful text
- The API endpoints **should** return `application/json`, and **must** return an appropriate HTTP code.
- JSON responses **should** be of the form:
```JSON
{
    "status": "OK" | "FAIL",
    "data": {...}
}
```
- Endpoints **must** use an appropriate HTTP method, such as `POST` or `GET` for what is being accomplished.
- API request headers **must** contain `Genestack-API-Token: ***`, so the server can access the Genestack API with the appropriate permissions for the user in question. If any requests to the Genestack API aren't permitted, our server **must** return a HTTP 403 Forbidden code.
- Automated testing **may** be provided for the backend, and if so, code changes **must** pass the automated tests already there.

## API Endpoints

All API endpoints **must** begin with `/api`, although that isn't shown in this table.

All API endpoints other than `/` **may** return 403 Unauthorised if the Genestack API token isn't authorised.

<table>
    <tr>
        <th>Endpoint</th>
        <th>Method</th>
        <th>Body</th>
        <th>Return Code</th>
        <th>Return Body</th>
        <th>Notes</th>
    </tr>
    <tr>
        <td><code>/</code></td>
        <td>GET</td>
        <td></td>
        <td>200 OK</td>
        <td>

```json
{
    "status": "OK",
    "data": {
        "version": "1.0.0"
    }
}
``` 
   
</td>
        <td>API token in header not required</td>
    </tr>
    <tr>
        <td rowspan=3><code>/studies</code></td>
        <td>GET</td>
        <td></td>
        <td>200 OK</td>
        <td>

```json
{
    "status": "OK",
    "data": {
        "studies": [
            {
                "studyAccession": "ABC123",
                "studyName": "Study Name",
                ...
            }
        ]
    }
}

```

</td>
        <td></td>
    </tr>
    <tr>
        <td rowspan=2>POST</td>
        <td rowspan=2>

```json
{
    "metadataKey": "metadataValue",
    ...
}
```

</td>
        <td>201 Created</td>
        <td>

```json
{
    "status": "OK",
    "data": {
        "studyAccession": "newAccession",
        "metadataKey": "metadataValue",
        ...
    }
}
```

</td>
        <td></td>
    </tr>
    <tr>
        <td>400 Bad Request</td>
        <td>

```json
{
    "status": "FAIL",
    "data": {
        error data
    }
}
```

</td>
    <td>we'll return this if the <code>uploadtogenestack</code> package can't create the study, and returns an error</td>
    </tr>
    <tr>
        <td rowspan=2><code>/studies/{id}</code>
        <td rowspan=2>GET</td>
        <td rowspan=2></td>
        <td>200 OK</td>
        <td>

```json
{
    "status": "OK",
    "data": {
        "studyAccession": "id",
        ...
    }
}
```

</td>
    </tr>
    <tr>
        <td>404 Not Found</td>
        <td>

```json
{
    "status": "FAIL",
    "data": {
        not found error data
    }
}
```

</td>
    <td>When we can't find the study with that id</td>


</table>

*TODO: Finish Table*


## Frontend

- The frontend will be used to generate API requests to our server, and present any responses back to the user.
- Frontend pages **must not** be accessed before prompting the user for a Genestack API token. This **may** be stored in the session for convenience.
- From here on, "frontend pages" refers to **all** pages **except** pages displaying an error code (such as 404 Not Found), help pages and a page prompting for an API token.
- Frontend pages **should** have a side bar to the right laying out an overview of the study they are currently browsing
- Frontend pages **must** have appropriate titles and subtitles to allow the user to understand where they are in the application
- Frontend pages **must** have text describing what can be accomplished on that page, and how to accomplish it. This **should not** be too detailed to avoid clutter.
- Frontend pages **should** have a link to more help documentation, such as a dedicated help page.
- Frontend pages **may** have a link to contact HGI for help.
- Frontend pages **should** have a minimalist style to avoid clutter and help users understand what is on the page
- Frontend pages **should** flow in a logical way to help the users out
- Frontend pages **must** work on tablet sized screens as a minimum

## Frontend Pages

- `/`
    - This page **must** prompt the user for a Genestack API token
    - This page **should** allow the user to create a new study, or select a pre-existing one.
    - The page **must not** display already existing studies before the API token has been given
    - The page **must not** display existing studies not accesable by that API token
- `/study` and `/study/{id}`
    - `/study` is for creating new studies, `/study/{id}` is for modifying existing studies. Both **must** use the same interface, and if an existing study is provided, fields **must** be pre-filled on page load.
    - The user **may** be given the option to select a template from those in Genestack
    - Metadata fields **should** be in a form, and there **must** be a clear action button to make the changes
- `/study/{study_id}/signal` and `/study/{study_id}/signal/{signal_id}`
    - `/study/{study_id}/signal` is for uploading new datasets, `/study/{study_id}/signal/{signal_id}` is for modifying existing datasets. Both **must** use the same interface, and if an existing dataset is provided, fields **must** be pre-filled on page load.
    - The user **must** be given the option to:
        - select whether it is an Expression or Variant dataset
        - provide a tag for the dataset
        - provide a location for the dataset
        - specify a set of linking attribute columns from the columns
        - validate the dataset
        - view the validation output
        - upload the dataset if it passes validation
    - the validation is accomplished within the `uploadtogenestack` package
    - the user **should** be told if the path provided doesn't seem valid
    - if it an expression dataset, the user **should** be provided the option to generate a minimal VCF file

## Changes to this Specification

Changes to this specification **must** be given in their own specification document, in `docs/spec/main-spec-updates`. These **must** be given sequential numbers in their document title.