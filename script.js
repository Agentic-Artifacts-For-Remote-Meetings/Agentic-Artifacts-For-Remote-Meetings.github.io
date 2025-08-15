const tableBody = document.querySelector('#papers-table tbody');
const filtersDiv = document.querySelector('#filters');
let activeFilters = {};

let originalData = [];

// Load data from JSON files and create filters
async function loadData() {
    try {
        const [jsonData, orderingData] = await Promise.all([
            fetch
                ('data-ck.json').then((response) => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! Status: ${response.status}`);
                    }
                    return response.json();
                }),
            loadOrderingData(),
        ]);


         

        originalData = jsonData;
        const sortedData = sortData(jsonData, 'Author');
        createFilters(jsonData, orderingData);
        renderTable(sortedData);
        updateDisabledButtons();
    } catch (error) {
        console.error('Error fetching JSON data:', error);
    }
}

// Load ordering data for the filter keys and buttons
async function loadOrderingData() {
    try {
        const response = await fetch('ordering_CK.json');
        if (!response.ok) {
            console.warn('Could not load ordering JSON data. Using default ordering.');
            return null;
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching ordering JSON data:', error);
        return null;
    }
}

// Render the table with the given data
function renderTable(data) {
    const noDataMessage = document.getElementById('no-data-message');

    if (data.length === 0) {
        noDataMessage.style.display = 'block';
    } else {
        noDataMessage.style.display = 'none';
    }



    tableBody.innerHTML = data.map(paper => {
        let displayDOI;
        if (paper.DOI_URL.startsWith('https://doi.org/')) {
            displayDOI = paper.DOI_URL.replace('https://doi.org/', '');
        } else {
            displayDOI = paper.DOI_URL.slice(0, 30) + '...';
        }

        if (paper.Cognition_note === undefined) {
            Activity_note_display = "";
        } else {
            Activity_note_display = paper.Processed_Human_Activity_note;
        }

        if (paper.Affect_note === undefined) {
            Timing_note_display = "";
        } else {
            Timing_note_display = paper.Timing_of_Delivery_note;
        }

        if (paper.Outcome_note === undefined) {
            Outcome_note_display = "";
        } else {
            Outcome_note_display = paper.Outcome_note;
        }

        return `
      <tr>
        <td>${paper.Author}</td>
        <td>${paper.Year}</td>
        <td>${paper.Title}</td>
        <td><a href="${paper.DOI_URL}" target="_blank">${displayDOI}</a></td>
        <td>${Activity_note_display}</td>
        <td>${Timing_note_display}</td>
        <td>${Outcome_note_display}</td>
      </tr>
    `;
    }).join('');

    // Add event listeners
    tableBody.querySelectorAll('tr').forEach((row) => {
        row.addEventListener('mouseover', () => {
            const rowData = data[row.sectionRowIndex];
            highlightFilters(rowData);
        });
    });

    document.querySelectorAll('.filter-btn').forEach((btn) => {
        btn.addEventListener('mouseover', () => {
            highlightFilters({});
        });
    });
}

// Create filter groups based on the provided data and ordering
function createFilters(jsonData, orderingData) {
    let filterKeys;
    let groups;
    if (orderingData) {
        filterKeys = orderingData.keysOrder;
        groups = orderingData.groups;
    } //else {
      //  filterKeys = Object.keys(jsonData[0]).filter(
       //     (key) => !['id', 'Author', 'Year', 'Paper', 'DOI_URL'].includes(key)
       // );
       // groups = [{ name: '', keys: filterKeys }];
    //}

    const filtersContainer = document.getElementById('filters');

    groups.forEach((group) => {
        const groupContainer = document.createElement('div');
        groupContainer.classList.add('filter-group-container');
        const groupName = document.createElement('h3');
        groupName.textContent = group.name;
        groupName.classList.add('filter-group-name');
        groupContainer.appendChild(groupName);

        group.keys.forEach((key) => {
            const filterGroup = document.createElement('div');
            filterGroup.classList.add('filter-group');
            const filterKey = document.createElement('span');
            filterKey.textContent = key;
            filterKey.classList.add('filter-key');
            filterGroup.appendChild(filterKey);

            let uniqueValues;
            if (orderingData) {
                uniqueValues = orderingData.buttonsOrder[key];
            } //else {
               // uniqueValues = [
                //    ...new Set(jsonData.map((paper) => paper[key])),
               // ].sort();
           // }

            uniqueValues.forEach((value) => {
                const filterBtn = document.createElement('button');
                filterBtn.textContent = value;
                filterBtn.classList.add('filter-btn');
                filterBtn.addEventListener('click', () => {

                    filterBtn.classList.toggle('active');
                    applyFilters();
                });
                filterGroup.appendChild(filterBtn);
            });

            filterKey.addEventListener('click', () => {
                filterGroup.querySelectorAll('.filter-btn.active').forEach((btn) => {
                    btn.classList.remove('active');
                });
                applyFilters();
            });

            groupContainer.appendChild(filterGroup);
        });

        filtersContainer.appendChild(groupContainer);
    });

    adjustFilterButtonsWidth();
}

// Apply the active filters to the table
function applyFilters() {
    const activeFilters = Array.from(
        document.querySelectorAll('.filter-group')
    ).reduce((acc, filterGroup) => {
        const key = filterGroup.querySelector('.filter-key').textContent;
        const activeValues = Array.from(
            filterGroup.querySelectorAll('.filter-btn.active')
        ).map((btn) => btn.textContent);
        if (activeValues.length > 0) {
            acc[key] = activeValues;
        }
        return acc;
    }, {});

    const filteredData = originalData.filter((paper) => {
        return Object.keys(activeFilters).every((key) => {




            return activeFilters[key].includes(paper[key]);
        });
    });

    const sortedData = sortData(filteredData, 'Author');

    // Render the table
    renderTable(sortedData);

    // Update disabled button states
    updateDisabledButtons();
}

// Sort the data by the specified column
function sortData(data, column, ascending = true) {
    return data.slice().sort((a, b) => {
        const valueA = column === 'Year' ? parseInt(a[column]) : a[column].toLowerCase();
        const valueB = column === 'Year' ? parseInt(b[column]) : b[column].toLowerCase();
        return (valueA < valueB ? -1 : (valueA > valueB ? 1 : 0)) * (ascending ? 1 : -1);
    });
}

// Adjust the width of filter buttons to fit the container
function adjustFilterButtonsWidth() {
    const filterGroups = document.querySelectorAll('.filter-group');
    const filtersContainer = document.getElementById('filters');
    const containerWidth = filtersContainer.clientWidth;

    filterGroups.forEach((filterGroup) => {
        const buttons = filterGroup.querySelectorAll('.filter-btn');
        const totalWidth = Array.from(buttons).reduce((width, btn) => {
            return width + btn.offsetWidth + parseFloat(window.getComputedStyle(btn).marginRight);
        }, 0);
        const remainingWidth = containerWidth - totalWidth;
        const extraWidth = remainingWidth / buttons.length;

        buttons.forEach((btn) => {
            btn.style.width = btn.offsetWidth + extraWidth + 'px';
            btn.style.boxSizing = 'border-box';
        });
    });
}

// Disable buttons that lead to empty list
function updateDisabledButtons() {
    const filterButtons = document.querySelectorAll('.filter-btn');

    filterButtons.forEach((button) => {
        const filterGroup = button.closest('.filter-group');
        const key = filterGroup.querySelector('.filter-key').textContent;
        const value = button.textContent;

        // Temporarily toggle this button's filter
        const isActive = button.classList.contains('active');
        button.classList.toggle('active');

        const appliedFilters = Array.from(document.querySelectorAll('.filter-group')).reduce((acc, filterGroup) => {
            const key = filterGroup.querySelector('.filter-key').textContent;
            const activeValues = Array.from(filterGroup.querySelectorAll('.filter-btn.active')).map((btn) => btn.textContent);
            if (activeValues.length > 0) {
                acc[key] = activeValues;
            }
            return acc;
        }, {});

        const filteredData = originalData.filter((paper) => {

           // console.log(paper[key]);
            const valuefd = paper[key];
            if ( /[,]/.test(valuefd)) {

                const values = valuefd.split(',');
              //  console.log(values);
                const appliedfilterkeys = Object.keys(appliedFilters);
                return Object.keys(appliedFilters).forEach(function (key) {
                //    console.log(appliedFilters[key]);
                    const afk2 = appliedFilters[key];
                //    console.log("checker");
                //    console.log(afk2);
                    for (var value2=0; value2 < values.length; value2++){
                  //      console.log("wir wollen jetzt checken ob werte gleich und wenn ja disablen");
                        for (var afk = 0; afk < afk2.length; afk++){
                     //       console.log(afk2[afk])
                     //       console.log(values[value2])

                       // if (afk2[afk] === values[value2]){
                        //          console.log("halo jetzt richtig");
                        //          console.log(button)
                            //      const isfilterneeded = true;
                                //  btnKeyArrayFD.set(values[value2], isfilterneeded);
                                  return afk2[afk] === values[value2];
                                  //button.classList.remove("button-disabled");
                           //   }
                            }
                    }
                    // Will be an array
                 });


              }
             else{

                return Object.keys(appliedFilters).every((key) => {
                //    console.log("normal");
                //    console.log(key);
                //    console.log(appliedFilters[key]);
                //    console.log(paper[key]);
                    return appliedFilters[key].includes(paper[key]);

        });
    }

        });

        // Revert this button's filter
        button.classList.toggle('active');

        if (filteredData.length === 0 && !isActive) {
            button.classList.add("button-disabled");
        } else {
            button.classList.remove("button-disabled");
        }

    });
}

// Highlight hovered row
function highlightFilters(rowData) {
    // Remove highlight from all filter buttons
    const allFilterBtns = document.querySelectorAll('.filter-btn');
    allFilterBtns.forEach((btn) => {
        btn.classList.remove('hover-highlight');
    });

    // Add highlight to relevant filter buttons
    Object.keys(rowData).forEach((key) => {
        const value = rowData[key];


        if ( /[,]/.test(value)) {
            const values = value.split(',');


            for (var value2=0; value2 < values.length; value2++){
                const btnKeyArray = new Map();

               // console.log(btnKey === key && btn.textContent === values[value2]);
                //return btnKey === key && btn.textContent === values[value2] ;
             //   const btnKeyArray = [];
                const filterBtn2 = Array.from(allFilterBtns).find((btn) => {

                const btnKey = btn.parentElement.querySelector('.filter-key').textContent;
                const valuebtnKey = (btnKey === key && btn.textContent ===  values[value2]);
                btnKeyArray.set(btn, valuebtnKey);
                  //  console.log(btnKey);
                 //   console.log(key);


                btnKeyArray.forEach(function(value, key, map){
                    if (value){

                    key.classList.add('hover-highlight');
                }
                });

                    //return btnKeyArray;
                });

                //btnKeyArray.forEach(function(eachItem){
                   // if (eachItem){
                  //  console.log(eachItem);
                   // filterBtn2.classList.add('hover-highlight');
                //}
                //});

                     }
            //return btnKey === key && btn.textContent === value;
        }

       // if (value.contains(",")) {
        //const values = rowData[key].split(',');}

        const filterBtn = Array.from(allFilterBtns).find((btn) => {
            const btnKey = btn.parentElement.querySelector('.filter-key').textContent;
          //  console.log(btnKey);
          //  console.log(key);
          //  console.log(value);
          //  console.log(btn.textContent);
            return btnKey === key && btn.textContent === value;
        });

        if (filterBtn) {

            filterBtn.classList.add('hover-highlight');
        }

       // const filterBtn2 = Array.from(allFilterBtns).find((btn2) => {
        //    const btnKey2 = btn2.parentElement.querySelector('.filter-key').textContent;
         //   for (var value2=0; value2 < values.length; value2++){
          //      return btnKey2 === key && btn2.textContent === value2 ;
           // }
            //return btnKey2 === key && btn2.textContent === value2 ;
       // });



        //if (filterBtn2) {
         //   filterBtn2.classList.add('hover-highlight');
     //   }
    });
}





const titleBar = document.getElementById("title-bar");

window.addEventListener("scroll", () => {
    if (window.scrollY > 35) {
        titleBar.style.transform = "translateY(-100%)";
    } else {
        titleBar.style.transform = "";
    }
});

window.onload = () => {
    loadData();
    setTimeout(adjustFilterButtonsWidth, 100);
};
