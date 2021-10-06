import './App.css';
import { Form, FormGroup, FormControl, FormLabel, Button } from "react-bootstrap";

function TokenPage() {
  return (
    <div className="App">
      <header className="App-header">
        <div className="Internal">
        <h1>Genestack Uploader</h1>
        <br />
        <Form class="m-3">
          <FormGroup class="m-3">
            <FormLabel>API Token</FormLabel>
            <FormControl type="text" />
          </FormGroup>
          <FormGroup class="m-3">
            <FormLabel>Study</FormLabel>
            <FormControl as="select"><option>Test</option></FormControl>
          </FormGroup>
          <Button variant="primary" type="submit">Submit</Button>
        </Form>
          
          </div>
      </header>
    </div>
  );
}

export default TokenPage;
