const tableBody = document.querySelector('#papers-table tbody');
const toolsTableBody = document.querySelector('#tools-table tbody');
const filtersDiv = document.querySelector('#filters');
let activeFilters = {};

let originalResearchData = [];
let originalToolsData = [];

// Load data from JSON files and create filters
async function loadData() {
    try {
        const [researchData, toolsData, orderingData] = await Promise.all([
            fetch('data-research.json').then((response) => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            }),
            fetch('data-tools.json').then((response) => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            }),
            loadOrderingData(),
        ]);

        console.log('Data loaded successfully');
        console.log('Research data:', researchData.length, 'items');
        console.log('Tools data:', toolsData.length, 'items');
        console.log('Ordering data:', orderingData);

        originalResearchData = researchData;
        originalToolsData = toolsData;
        const sortedResearchData = sortData(researchData, 'Author');
        const sortedToolsData = sortData(toolsData, 'Name');
        createFilters(researchData, orderingData);
        renderTable(sortedResearchData, 'papers-table', false);
        renderTable(sortedToolsData, 'tools-table', true);
        updateDisabledButtons();
    } catch (error) {
        console.error('Error fetching JSON data:', error);
    }
}

// Load ordering data for the filter keys and buttons
async function loadOrderingData() {
    try {
        const response = await fetch('ordering.json');
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
function renderTable(data, tableId, isTools) {
    const noDataMessageId = isTools ? 'no-data-message-tools' : 'no-data-message';
    const noDataMessage = document.getElementById(noDataMessageId);
    const tbody = document.querySelector(`#${tableId} tbody`);
    const countElementId = isTools ? 'tools-count' : 'research-count';
    const countElement = document.getElementById(countElementId);

    // Update result count
    if (countElement) {
        const totalCount = isTools ? originalToolsData.length : originalResearchData.length;
        const itemType = isTools ? 'tool' : 'paper';
        const itemTypeLabel = isTools ? 'Tools' : 'Papers';
        if (data.length === 0) {
            countElement.textContent = `No ${itemType}s found`;
        } else if (data.length === totalCount) {
            countElement.textContent = `Showing all ${data.length} ${itemTypeLabel.toLowerCase()}`;
        } else {
            countElement.textContent = `Showing ${data.length} of ${totalCount} ${itemTypeLabel.toLowerCase()}`;
        }
    }

    if (data.length === 0) {
        noDataMessage.style.display = 'block';
    } else {
        noDataMessage.style.display = 'none';
    }

    if (isTools) {
        // Render tools table with Name, Provider, Link, and notes
        tbody.innerHTML = data.map(tool => {
            const Activity_note_display = tool.Activity_note || "";
            const Timing_note_display = tool.Timing_note || "";

            return `
      <tr>
        <td>${tool.Name}</td>
        <td>${tool.Provider}</td>
        <td><a href="${tool.Link}" target="_blank">${tool.Link.slice(0, 50)}...</a></td>
        <td>${Activity_note_display}</td>
        <td>${Timing_note_display}</td>
      </tr>
    `;
        }).join('');
    } else {
        // Render research table with Author, Year, Title, DOI, and notes
        tbody.innerHTML = data.map(paper => {
            let displayDOI;
            if (paper.DOI_URL.startsWith('https://doi.org/')) {
                displayDOI = paper.DOI_URL.replace('https://doi.org/', '');
            } else {
                displayDOI = paper.DOI_URL.slice(0, 30) + '...';
            }

            const Activity_note_display = paper.Activity_note || "";
            const Timing_note_display = paper.Timing_note || "";
            const Outcome_note_display = paper.Outcome_note || "";

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
    }

    // Add event listeners for hover highlighting
    tbody.querySelectorAll('tr').forEach((row) => {
        row.addEventListener('click', () => {
            const rowData = data[row.sectionRowIndex];
            highlightFilters(rowData);
        });
    });

    document.querySelectorAll('.filter-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            highlightFilters({});
        });
    });

    // Add column sorting functionality
    addColumnSortListeners(data, tableId, isTools);
    
    // Update sort indicators on headers
    updateSortIndicators(tableId, isTools);
}

// Update visual indicators on sortable headers
function updateSortIndicators(tableId, isTools) {
    const table = document.getElementById(tableId);
    const headers = table.querySelectorAll('thead th');
    
    headers.forEach((header, index) => {
        // Store original text without any arrows
        const originalText = header.textContent.replace(/\s*[↑↓\s]+$/, '').trim();
        
        // Determine if this column is sortable
        let sortColumn = null;
        if (isTools) {
            const toolsColumns = ['Name', 'Provider', null, 'Activity_note', 'Timing_note'];
            sortColumn = toolsColumns[index];
        } else {
            const researchColumns = ['Author', 'Year', 'Title', null, 'Activity_note', 'Timing_note', 'Outcome_note'];
            sortColumn = researchColumns[index];
        }
        
        if (sortColumn === null) {
            // Non-sortable column - no arrows
            header.textContent = originalText;
            header.classList.remove('is-sorted');
            header.classList.remove('is-sortable');
        } else if (currentSort.tableId === tableId && sortColumn === currentSort.column) {
            // This column is currently sorted - show only the current direction arrow
            const arrow = currentSort.ascending ? '↑' : '↓';
            header.textContent = originalText + ' ' + arrow;
            header.classList.add('is-sorted');
            header.classList.remove('is-sortable');
        } else {
            // Sortable but not currently sorted - show both arrows (grayed out) in a span
            header.innerHTML = originalText + ' <span class="sort-arrows">↑↓</span>';
            header.classList.remove('is-sorted');
            header.classList.add('is-sortable');
        }
    });
}

// Track current sort state
let currentSort = {
    tableId: null,
    column: null,
    ascending: true
};

// Add click listeners to sortable column headers
function addColumnSortListeners(data, tableId, isTools) {
    const table = document.getElementById(tableId);
    const headers = table.querySelectorAll('thead th');
    
    headers.forEach((header, index) => {
        // Clear previous listeners by cloning
        const newHeader = header.cloneNode(true);
        header.parentNode.replaceChild(newHeader, header);
        
        // Determine if this column is sortable
        let sortColumn = null;
        if (isTools) {
            const toolsColumns = ['Name', 'Provider', null, 'Activity_note', 'Timing_note'];
            sortColumn = toolsColumns[index];
        } else {
            const researchColumns = ['Author', 'Year', 'Title', null, 'Activity_note', 'Timing_note', 'Outcome_note'];
            sortColumn = researchColumns[index];
        }
        
        if (sortColumn) {
            newHeader.classList.add('sortable-header');
            newHeader.style.cursor = 'pointer';
            newHeader.style.userSelect = 'none';
            
            newHeader.addEventListener('click', () => {
                // Check if we're clicking the same column
                const isSameColumn = currentSort.tableId === tableId && currentSort.column === sortColumn;
                
                // Toggle direction if same column, otherwise start ascending
                if (isSameColumn) {
                    currentSort.ascending = !currentSort.ascending;
                } else {
                    currentSort.tableId = tableId;
                    currentSort.column = sortColumn;
                    currentSort.ascending = true;
                }
                
                const sortedData = sortData(data, sortColumn, currentSort.ascending);
                renderTable(sortedData, tableId, isTools);
            });
        } else {
            newHeader.style.cursor = 'default';
            newHeader.style.opacity = '0.7';
        }
    });
}

// Create filter groups based on the provided data and ordering
function createFilters(jsonData, orderingData) {
    let filterKeys;
    let groups;
    if (orderingData) {
        filterKeys = orderingData.keysOrder;
        groups = orderingData.groups;
    } else {
        console.error('Ordering data is missing. Filters will not be created.');
        return;
    }

    const filtersContainer = document.getElementById('filters');
    if (!filtersContainer) {
        console.error('Filters container not found in HTML.');
        return;
    }

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

// Apply the active filters to both tables
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

    // Filter research data
    const filteredResearchData = originalResearchData.filter((paper) => {
        return Object.keys(activeFilters).every((key) => {
            const value = paper[key];
            // Handle missing fields gracefully (research-only fields)
            if (value === undefined) return true;
            return activeFilters[key].includes(value);
        });
    });

    // Filter tools data
    const filteredToolsData = originalToolsData.filter((tool) => {
        return Object.keys(activeFilters).every((key) => {
            const value = tool[key];
            // Handle missing fields gracefully (tools lack some research fields)
            if (value === undefined) return true;
            return activeFilters[key].includes(value);
        });
    });

    // If we have an active sort, use it; otherwise use defaults
    let sortedResearchData, sortedToolsData;
    
    if (currentSort.tableId === 'papers-table' && currentSort.column) {
        sortedResearchData = sortData(filteredResearchData, currentSort.column, currentSort.ascending);
    } else {
        sortedResearchData = sortData(filteredResearchData, 'Author');
    }
    
    if (currentSort.tableId === 'tools-table' && currentSort.column) {
        sortedToolsData = sortData(filteredToolsData, currentSort.column, currentSort.ascending);
    } else {
        sortedToolsData = sortData(filteredToolsData, 'Name');
    }

    // Render both tables
    renderTable(sortedResearchData, 'papers-table', false);
    renderTable(sortedToolsData, 'tools-table', true);

    // Update disabled button states
    updateDisabledButtons();
}

// Sort the data by the specified column
function sortData(data, column, ascending = true) {
    return data.slice().sort((a, b) => {
        let valueA = a[column] || '';
        let valueB = b[column] || '';
        
        if (column === 'Year') {
            valueA = parseInt(valueA) || 0;
            valueB = parseInt(valueB) || 0;
        } else {
            valueA = valueA.toString().toLowerCase();
            valueB = valueB.toString().toLowerCase();
        }
        
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

// Disable buttons that lead to empty list (check both datasets combined)
function updateDisabledButtons() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    const activeTab = document.querySelector('.tab-content.active').id;

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

        // Filter both datasets
        const filteredResearchData = originalResearchData.filter((paper) => {
            return Object.keys(appliedFilters).every((key) => {
                const value = paper[key];
                if (value === undefined) return true;
                return appliedFilters[key].includes(value);
            });
        });

        const filteredToolsData = originalToolsData.filter((tool) => {
            return Object.keys(appliedFilters).every((key) => {
                const value = tool[key];
                if (value === undefined) return true;
                return appliedFilters[key].includes(value);
            });
        });

        // Button is disabled only if both datasets return empty results
        const totalResults = filteredResearchData.length + filteredToolsData.length;

        // Revert this button's filter
        button.classList.toggle('active');

        // Check if this filter applies to current tab
        const toolsOnlyFields = ['Meeting Task', 'Team Size', 'Meeting Duration', 'Meeting Environment', 'Outcome'];
        const isToolsOnlyFilter = toolsOnlyFields.includes(key);
        const isCurrentlyOnToolsTab = activeTab === 'tools-tab';

        if (totalResults === 0 && !isActive) {
            button.classList.add("button-disabled");
            button.classList.remove("filter-not-applicable");
            button.title = '';
        } else if (isToolsOnlyFilter && isCurrentlyOnToolsTab && isActive) {
            // If on tools tab and filter doesn't apply to tools, show different style
            button.classList.add("filter-not-applicable");
            button.classList.remove("button-disabled");
            button.title = 'This filter does not apply to Practice Tools';
        } else {
            button.classList.remove("button-disabled");
            button.classList.remove("filter-not-applicable");
            button.title = '';
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
    
    // Tab switching functionality
    document.querySelectorAll('.tab-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            const tabName = btn.getAttribute('data-tab');
            
            // Remove active class from all tabs and buttons
            document.querySelectorAll('.tab-content').forEach((tab) => {
                tab.classList.remove('active');
            });
            document.querySelectorAll('.tab-btn').forEach((button) => {
                button.classList.remove('active');
            });
            
            // Add active class to clicked tab and button
            document.getElementById(tabName).classList.add('active');
            btn.classList.add('active');
            
            // Update disabled button states for the new active tab
            updateDisabledButtons();
        });
    });

    document.addEventListener('click', (event) => {
        const clickedInsideTable =
            event.target.closest('#papers-table') ||
            event.target.closest('#tools-table');

        // Only reset highlight if the user clicked OUTSIDE both tables
        if (!clickedInsideTable) {
            highlightFilters({});
        }
    });

    // Reset filters button functionality
    const resetBtn = document.getElementById('reset-filters-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            // alle aktiven Filter-Buttons deaktivieren
            document.querySelectorAll('.filter-btn.active').forEach((btn) => {
                btn.classList.remove('active');
            });

            // Tabellen neu rendern mit leeren Filtern
            applyFilters();
        });
    }
};