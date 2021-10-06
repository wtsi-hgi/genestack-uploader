import { Form, FormGroup, FormLabel, FormControl, Button } from "react-bootstrap"

const Study = () => {
    return(
        <div className="App">
            <h1>Genestack Uploader</h1>
            <div className="flex-container">
                <div className="Internal wide-area form-area">
                    <div class="Internal form-area">
                        <Form>
                            <FormGroup>
                                <FormLabel column="sm">Template</FormLabel>
                                <FormControl size="sm" as="select">
                                    <option>Template 1</option>
                                    <option>Template 2</option>
                                </FormControl>
                            </FormGroup>
                        </Form>
                    </div>
                    <div className="Internal mt-5 form-area">
                        <Form>
                            <FormGroup>
                                <FormLabel column="sm">Study Name</FormLabel>
                                <FormControl type="text" size="sm"></FormControl>
                                <FormLabel column="sm">Description</FormLabel>
                                <FormControl type="text" size="sm"></FormControl>
                                <FormLabel column="sm">Contact</FormLabel>
                                <FormControl type="text" size="sm"></FormControl>
                                <Button type="primary" className="mt-2" size="sm">Submit</Button>
                            </FormGroup>
                        </Form>
                    </div>
                </div>
                <div className="Internal narrow-area"></div>
            </div>
        </div>
    )
}

export default Study;