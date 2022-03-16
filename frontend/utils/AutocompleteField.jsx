/**
Genestack Uploader
A HTTP server providing an API and a frontend for easy uploading to Genestack

Copyright (C) 2022 Genome Research Limited

Author: Michael Grace <mg38@sanger.ac.uk>

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { Fragment } from "react";
import { useState } from "react";
import styles from "../styles/Home.module.css";

export const AutocompleteField = ({
  suggestions,
  defaultValue,
  placeholder,
  blurHandler,
  keyID
}) => {
  const [filteredSuggestsions, setFilteredSuggestions] = useState(suggestions);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [userInput, setUserInput] = useState(defaultValue);

  const textChangeHandler = (e) => {
    let newUserInput = e.currentTarget.value;
    let newFilteredSuggestions = suggestions.filter(
      (s) => s.toLowerCase().indexOf(newUserInput.toLowerCase()) > -1
    );

    setFilteredSuggestions(newFilteredSuggestions);
    setShowSuggestions(true);
    setUserInput(newUserInput);
  };

  const clickHandler = (e) => {
    setFilteredSuggestions([]);
    setShowSuggestions(false);
    console.log(e)
    setUserInput(e.target.innerText);
    console.log(e.target)
    blurHandler(e.target.innerText);
  };

  return (
    <Fragment>
      <input
        type="text"
        defaultValue={defaultValue}
        placeholder={placeholder}
        onBlur={(e) => {blurHandler(e.target.value)}}
        onChange={textChangeHandler}
        value={userInput}
      />
      {showSuggestions && userInput && filteredSuggestsions.length != 0 && (
        <ul className={styles.suggestions}>
          {filteredSuggestsions.map((suggestion, idx) => (
            <li key={`suggestion-${keyID}-${idx}`} onClick={clickHandler}>
              {suggestion}
            </li>
          ))}
        </ul>
      )}
    </Fragment>
  );
};
