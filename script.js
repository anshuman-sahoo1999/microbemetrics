// Listen for CSV file uploads
document.getElementById("csvInput").addEventListener("change", handleFileUpload);

function handleFileUpload(event) {
  let file = event.target.files[0];
  if (file) {
    Papa.parse(file, {
      header: false,
      complete: function(results) {
        // Expect CSV format: species, count per row
        let parsedData = results.data;
        let formattedData = "";
        parsedData.forEach(row => {
          if (row.length >= 2 && row[0] && row[1]) {
            formattedData += row[0] + ": " + row[1] + "\n";
          }
        });
        document.getElementById("speciesData").value = formattedData;
      }
    });
  }
}

// Add species from dropdown to the textarea
function addSpeciesFromDropdown() {
  let dropdown = document.getElementById("speciesDropdown");
  let value = dropdown.value;
  let textarea = document.getElementById("speciesData");
  if (textarea.value.trim() !== "") {
    textarea.value += "\n" + value;
  } else {
    textarea.value = value;
  }
}

// Parse the input text (supports both "Name: Count" and CSV "Name,Count")
function parseInput(input) {
  let lines = input.split("\n");
  let speciesData = [];
  lines.forEach(line => {
    line = line.trim();
    if (line) {
      if (line.includes(",")) {
        // CSV format: name, count
        let parts = line.split(",");
        if (parts.length >= 2) {
          let name = parts[0].trim();
          let count = parseInt(parts[1].trim());
          if (!isNaN(count)) {
            speciesData.push({ name, count });
          }
        }
      } else if (line.includes(":")) {
        // Format: Name: Count
        let parts = line.split(":");
        if (parts.length >= 2) {
          let name = parts[0].trim();
          let count = parseInt(parts[1].trim());
          if (!isNaN(count)) {
            speciesData.push({ name, count });
          }
        }
      }
    }
  });
  return speciesData;
}

// Calculate Shannon Diversity Index
function calculateShannonIndex(data, total) {
  let shannon = 0;
  data.forEach(d => {
    let p = d.count / total;
    if (p > 0) {
      shannon -= p * Math.log(p);
    }
  });
  return shannon;
}

// Calculate Simpson Diversity Index
function calculateSimpsonIndex(data, total) {
  let simpson = 0;
  data.forEach(d => {
    let p = d.count / total;
    simpson += p * p;
  });
  return simpson;
}

// Generate Chart.js pie chart visualization
function generateChart(speciesData) {
  let ctx = document.getElementById("diversityChart").getContext("2d");
  let labels = speciesData.map(d => d.name);
  let counts = speciesData.map(d => d.count);
  // Destroy previous chart instance if it exists
  if (window.myChart instanceof Chart) {
    window.myChart.destroy();
  }
  window.myChart = new Chart(ctx, {
    type: "pie",
    data: {
      labels: labels,
      datasets: [{
        data: counts,
        backgroundColor: [
          "#ff6384",
          "#36a2eb",
          "#ffce56",
          "#4CAF50",
          "#9966ff",
          "#ff9f40",
          "#2ecc71",
          "#e74c3c"
        ]
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });
}

// Generate a simple phylogenetic tree using D3.js
function generatePhylogeneticTree(speciesData) {
  // Create a basic hierarchical structure from species data
  let treeData = {
    name: "Microbes",
    children: speciesData.map(d => ({ name: d.name }))
  };

  // Clear previous visualization
  d3.select("#phyloTree").selectAll("*").remove();

  // Set dimensions and margins
  let margin = { top: 20, right: 90, bottom: 30, left: 90 },
      width = document.getElementById("phyloTree").clientWidth - margin.left - margin.right,
      height = document.getElementById("phyloTree").clientHeight - margin.top - margin.bottom;

  // Append SVG object to the div
  let svg = d3.select("#phyloTree")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  // Create tree layout
  let treemap = d3.tree().size([height, width]);
  let nodes = d3.hierarchy(treeData);
  nodes = treemap(nodes);

  // Links between nodes
  svg.selectAll(".link")
    .data(nodes.descendants().slice(1))
    .enter().append("path")
    .attr("class", "link")
    .attr("d", function(d) {
      return "M" + d.y + "," + d.x +
             "C" + (d.parent.y + 50) + "," + d.x +
             " " + (d.parent.y + 50) + "," + d.parent.x +
             " " + d.parent.y + "," + d.parent.x;
    })
    .attr("fill", "none")
    .attr("stroke", "#bdc3c7");

  // Nodes
  let node = svg.selectAll(".node")
    .data(nodes.descendants())
    .enter().append("g")
    .attr("class", function(d) {
      return "node" + (d.children ? " node--internal" : " node--leaf");
    })
    .attr("transform", function(d) {
      return "translate(" + d.y + "," + d.x + ")";
    });

  node.append("circle")
    .attr("r", 8)
    .attr("stroke", "#34495e")
    .attr("fill", "#ecf0f1");

  node.append("text")
    .attr("dy", ".35em")
    .attr("x", function(d) { return d.children ? -15 : 15; })
    .style("text-anchor", function(d) {
      return d.children ? "end" : "start";
    })
    .text(function(d) { return d.data.name; })
    .style("font-size", "0.9em")
    .style("fill", "#2c3e50");
}

// Analyze diversity: Parse data, compute indices, generate chart and phylogenetic tree
function analyzeDiversity() {
  let input = document.getElementById("speciesData").value;
  let speciesData = parseInput(input);
  if (speciesData.length === 0) {
    alert("Please enter valid species data.");
    return;
  }
  let total = speciesData.reduce((sum, d) => sum + d.count, 0);
  let shannon = calculateShannonIndex(speciesData, total);
  let simpson = calculateSimpsonIndex(speciesData, total);
  let richness = speciesData.length;

  document.getElementById("shannonIndex").innerText = shannon.toFixed(4);
  document.getElementById("simpsonIndex").innerText = simpson.toFixed(4);
  document.getElementById("speciesRichness").innerText = richness;

  generateChart(speciesData);
  generatePhylogeneticTree(speciesData);
}

// Export the results as a PDF using jsPDF
function exportPDF() {
  const { jsPDF } = window.jspdf;
  let doc = new jsPDF();
  let shannon = document.getElementById("shannonIndex").innerText;
  let simpson = document.getElementById("simpsonIndex").innerText;
  let richness = document.getElementById("speciesRichness").innerText;
  doc.setFontSize(16);
  doc.text("Microbial Diversity Analyzer Results", 10, 15);
  doc.setFontSize(12);
  doc.text("Shannon Index: " + shannon, 10, 30);
  doc.text("Simpson Index: " + simpson, 10, 40);
  doc.text("Species Richness: " + richness, 10, 50);
  doc.save("diversity_results.pdf");
}
