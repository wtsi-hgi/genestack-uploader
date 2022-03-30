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

import { useState } from "react";
import styles from "../styles/Home.module.css";

export const AutocompleteField = ({
  suggestions,
  defaultValue,
  placeholder,
  blurHandler,
  keyID,
}) => {
  const [filteredSuggestsions, setFilteredSuggestions] = useState([]);
  const [userInput, setUserInput] = useState(defaultValue);

  const textChangeHandler = (e) => {
    // this is called when we type anything in the box
    // it will refilter the suggestions, and set userInput
    let newUserInput = e.currentTarget.value;
    let newFilteredSuggestions = suggestions.filter(
      (s) => s.toLowerCase().indexOf(newUserInput.toLowerCase()) > -1
    );

    setFilteredSuggestions(newFilteredSuggestions);
    setUserInput(newUserInput);
  };

  const clickHandler = (e) => {
    // this is called when we click a dropdown option
    // it sets userInput
    setUserInput(e.target.innerText);
  };

  return (
    <div
      onBlur={() => {
        // when we click off it, we call
        // the blur handler and clear
        // the suggestions dropdown
        setFilteredSuggestions([]);
        blurHandler(userInput);
      }}
      className="d-inline"
      tabIndex={0}
    >
      <input
        type="text"
        defaultValue={defaultValue}
        placeholder={placeholder}
        onChange={textChangeHandler}
        value={userInput}
      />

      {userInput && filteredSuggestsions.length != 0 && (
        <ul className={styles.suggestions}>
          {filteredSuggestsions.map((suggestion, idx) => (
            <li key={`suggestion-${keyID}-${idx}`} onMouseDown={clickHandler}>
              {suggestion}
            </li>
          ))}

          <li
            className={styles.closeSuggestions}
            onMouseDown={() => {
              setFilteredSuggestions([]);
            }}
          >
            Close Suggestions
          </li>
        </ul>
      )}
    </div>
  );
};
