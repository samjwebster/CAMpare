config_level_data = [];
sample_level_data = [];
selectedParameter = "auc";
selectedDatatype = "config";

window.addEventListener('load', function() {
    // This page uses d3 to graph any config parameter vs alignment
    // We need to load the data from all config files
    d3.json("models/models.json").then(function(data) {
        console.log(data);

        alignment_jsons = [];
        stats_jsons = [];

        for(let key in data) {
            alignment_path = `models/${key}/alignment_ratios.json`;
            stats_path = `models/${key}/stats.json`;
            alignment_jsons.push(d3.json(alignment_path));
            stats_jsons.push(d3.json(stats_path));
        }

        // Wait for all alignment and stats JSONs to load
        Promise.all(alignment_jsons).then(function(alignment_data) {
            Promise.all(stats_jsons).then(function(stats_data) {
                // Use the loaded data to populate the config_level_data and sample_level_data
                // Config level: one object per model, where alignment ratio is averaged

                for (let i = 0; i < alignment_data.length; i++) {
                    let model_name = Object.keys(data)[i];
                    let model_nickname = data[model_name].nickname;
                    let alignment = alignment_data[i];
                    let stats = stats_data[i];

                    // Calculate average alignment ratio
                    let total_alignment = 0;
                    let count = 0;
                    for (let key in alignment) {
                        total_alignment += alignment[key];
                        count++;
                    }
                    let average_alignment = total_alignment / count;
                    let stddev_alignment = Math.sqrt(alignment_data[i].reduce((sum, value) => sum + Math.pow(value - average_alignment, 2), 0) / count);

                    config_level_data.push({
                        model: model_name,
                        nickname: model_nickname,
                        alignment: average_alignment,
                        stddev_alignment: stddev_alignment,
                        stats: stats
                    });
                }

                // Sample level: one object per sample, where alignment ratio varies but stats are the same
                for (let i = 0; i < alignment_data.length; i++) {
                    let model_name = Object.keys(data)[i];
                    let model_nickname = data[model_name].nickname;
                    let alignment = alignment_data[i];
                    let stats = stats_data[i];

                    for (let sample in alignment) {
                        sample_level_data.push({
                            model: model_name,
                            nickname: model_nickname,
                            sample: sample,
                            alignment: alignment[sample],
                            stats: stats
                        });
                    }
                }

                // console.log("Config Level Data:", config_level_data.length, config_level_data);
                // console.log("Sample Level Data:", sample_level_data.length, sample_level_data);
                // Create the chart with the selected parameter and datatype
                createChart(selectedParameter, selectedDatatype);
            }).catch(function(error) {
                console.error("Error loading stats data:", error);
            });
        }).catch(function(error) {
            console.error("Error loading alignment data:", error);
        });
    }).catch(function(error) {
        console.error("Error loading models.json:", error);
    }
    );
});

function createChart(parameter, datatype) {
    let data = [];
    if (datatype === "config") {
        data = config_level_data;
    } else if (datatype === "sample") {
        data = sample_level_data;
    } else {
        console.error("Invalid datatype selected:", datatype);
        return;
    }

    if (data.length === 0) {
        console.error("No data available for the selected datatype:", datatype);
        return;
    }

    // Only use the mean (index 0) of each stat
    let filteredData = data.filter(d => d.stats && d.stats[parameter] && !isNaN(+d.stats[parameter][0]));
    if (filteredData.length === 0) {
        console.error("No valid data available for the selected parameter:", parameter);
        return;
    }

    // Coerce mean values to numbers
    filteredData.forEach(d => {
        d.stats[parameter][0] = +d.stats[parameter][0];
        d.stats[parameter][1] = +d.stats[parameter][1]; // Ensure std is also a number
    });

    // Clear previous chart
    let chart = document.getElementById('chart');
    chart.innerHTML = '';

    let svg = d3.select(chart)
        .append('svg')
        .attr('width', 480)
        .attr('height', 480);

    let margin = { top: 30, right: 0, bottom: 20, left: 50 };
    let width = +svg.attr('width') - margin.left - margin.right;
    let height = +svg.attr('height') - margin.top - margin.bottom;

    // Set x-axis domain
    let xDomain;
    if (["auc", "accuracy", "live_accuracy", "spoof_accuracy", "fnr_at_fpr_1"].includes(parameter)) {
        xDomain = [0, 1];
    } else if (parameter === "dprime") {
        xDomain = [0, 4];
    } else {
        xDomain = d3.extent(filteredData, d => d.stats[parameter][0]);
    }

    let x = d3.scaleLinear()
        .domain(xDomain)
        .range([margin.left, width - margin.right]);

    let y = d3.scaleLinear()
        .domain([0, 1])
        .range([height - margin.bottom, margin.top]);

    let xAxis = d3.axisBottom(x).ticks(10);
    let yAxis = d3.axisLeft(y).ticks(10);

    // Append gridlines
    let gridlinesX = d3.axisBottom(x)
        .tickSize(-height + margin.top + margin.bottom)
        .tickFormat('');
    let gridlinesY = d3.axisLeft(y)
        .tickSize(-width + margin.left + margin.right)
        .tickFormat('');

    svg.append('g')
        .attr('class', 'grid')
        .attr('stroke', '#ccc')
        .attr('stroke-width', 0.5)
        .attr('opacity', 0.25)
        .attr('transform', `translate(0,${height - margin.bottom})`)
        .call(gridlinesX);

    svg.append('g')
        .attr('class', 'grid')
        .attr('stroke', '#ccc')
        .attr('stroke-width', 0.5)
        .attr('opacity', 0.25)
        .attr('transform', `translate(${margin.left},0)`)
        .call(gridlinesY);

    // Append x-axis
    svg.append('g')
        .attr('transform', `translate(0,${height - margin.bottom})`)
        .call(xAxis);

    // Append y-axis
    svg.append('g')
        .attr('transform', `translate(${margin.left},0)`)
        .call(yAxis);

    // Axis labels
    parameter_label = "";
    if (parameter === "auc") {
        parameter_label = "AUC";
    } else if (parameter === "accuracy") {
        parameter_label = "Accuracy";
    } else if (parameter === "live_accuracy") {
        parameter_label = "Live Accuracy";
    } else if (parameter === "spoof_accuracy") {
        parameter_label = "Spoof Accuracy";
    } else if (parameter === "fnr_at_fpr_1") {
        parameter_label = "FNR at FPR 1%";
    } else if (parameter === "dprime") {
        parameter_label = "d'";
    } else {
        parameter_label = parameter.charAt(0).toUpperCase() + parameter.slice(1);
    }

    svg.append('text')
        .attr('x', width / 2)
        .attr('y', height + margin.bottom - 5)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .text(parameter_label);

    svg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -height / 2)
        .attr('y', margin.left - 30)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .text('Alignment');

    comparison_title = document.getElementById("comparison-title");
    comparison_title.innerHTML = `${parameter_label} vs Alignment`;

    
    if(datatype == "config") {
        // Draw horizontal error bars for the parameter
        svg.selectAll('.error-bar')
            .data(filteredData)
            .enter().append('line')
            .attr('class', 'error-bar')
            .attr('x1', d => x(d.stats[parameter][0] - d.stats[parameter][1])) // mean - std
            .attr('x2', d => x(d.stats[parameter][0] + d.stats[parameter][1])) // mean + std
            .attr('y1', d => y(d.alignment))
            .attr('y2', d => y(d.alignment))
            .attr('stroke', 'gray')
            .attr('stroke-width', 2);

        // Draw vertical error bars for the alignment
        svg.selectAll('.error-bar-vertical')
            .data(filteredData)
            .enter().append('line')
            .attr('class', 'error-bar')
            .attr('x1', d => x(d.stats[parameter][0])) // mean
            .attr('x2', d => x(d.stats[parameter][0])) // mean
            .attr('y1', d => y(d.alignment - d.stats[parameter][1])) // alignment - std
            .attr('y2', d => y(d.alignment + d.stats[parameter][1])) // alignment + std
            .attr('stroke', 'gray')
            .attr('stroke-width', 2);
    }


    // Plot points
    svg.selectAll('.dot')
        .data(filteredData)
        .enter().append('circle')
        .attr('class', 'dot')
        .attr('cx', d => x(d.stats[parameter][0])) // USE MEAN
        .attr('cy', d => y(d.alignment))
        .attr('r', 2.5)
        .style('fill', 'steelblue')
        .on('mouseover', function(event, d) {
            d3.select(this).style('fill', 'orange');
            let tooltip = d3.select('#tooltip');
            tooltip.style('display', 'block')
                .html(`Model: ${d.nickname ? d.nickname : d.model}${d.sample ? `<br>Sample: ${d.sample}` : ""}<br>${parameter_label}: ${d.stats[parameter][0].toFixed(3)+"±"+d.stats[parameter][1].toFixed(3)}<br>Alignment: ${datatype=="sample" ? d.alignment.toFixed(3) : d.alignment.toFixed(3)+"±"+d.stddev_alignment.toFixed(3)}`);
        })
        .on('mouseout', function() {
            d3.select(this).style('fill', 'steelblue');
            d3.select('#tooltip').style('display', 'none');
        });

    // Get regression line using ss
    let x_values = filteredData.map(d => d.stats[parameter][0]);
    let y_values = filteredData.map(d => d.alignment);
    let regression_data = x_values.map((x, i) => [x, y_values[i]]);

    let regression = ss.linearRegression(regression_data);
    let regression_line = ss.linearRegressionLine(regression);  
    let x1 = d3.min(x_values);
    let x2 = d3.max(x_values);
    let y1 = regression_line(x1);
    let y2 = regression_line(x2);

    svg.append('line')
        .attr('class', 'regression-line')
        .attr('x1', x(x1))
        .attr('y1', y(y1))
        .attr('x2', x(x2))
        .attr('y2', y(y2))
        .attr('stroke', 'red')
        .attr('stroke-width', 2)
        .style('stroke-dasharray', '2, 2');
    
    let r = ss.sampleCorrelation(x_values, y_values);
    let strength = Math.abs(r) >= 0.5 ? "strong" : Math.abs(r) >= 0.25 ? "moderate" : "weak";
    let direction = r > 0 ? "positive" : "negative";
    let summary = `There is <b>${strength} ${direction}</b> relationship between ${parameter_label} and Alignment.<br>* Correlation Coefficient (r): ${r.toFixed(3)}`;
    let relationship_text = document.getElementById("relationship");
    relationship_text.innerHTML = summary;
   
        
    // Tooltip creation
    if (d3.select('#tooltip').empty()) {
        d3.select('body').append('div')
            .attr('id', 'tooltip')
            .style('position', 'absolute')
            .style('background-color', 'white')
            .style('border', '1px solid black')
            .style('padding', '5px')
            .style('display', 'none')
            .style('pointer-events', 'none')
            .style('z-index', '1000');
    }

    d3.select('body').on('mousemove', function(event) {
        d3.select('#tooltip')
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 20) + 'px');
    });

    // Add cards ordered by alignment in rank-content
    let rankContent = document.getElementById("rank-content");
    rankContent.innerHTML = ""; // Clear previous content
    filteredData.sort((a, b) => b.alignment - a.alignment); // Sort by alignment ratio
    filteredData.forEach(d => {
        let rank = filteredData.indexOf(d) + 1;
        let newCard = `
        <div class="card" style="background-color: #f9f9f9; width: 95%; border-radius: 10px; padding: 5px; margin: 5px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); display: flex; flex-direction: column; align-items: center;">
            <h4 style="margin: 0; font-weight: normal;"><b>${rank}:</b> ${d.nickname ? d.nickname : d.model}${d.sample ? `, Sample ${d.sample}` : ""}</h4>
            <p style="margin: 0;">${parameter_label}: ${d.stats[parameter][0].toFixed(3)}±${d.stats[parameter][1].toFixed(3)}</p>
            <p style="margin: 0;">Alignment: ${d.alignment.toFixed(3)}${datatype=='config'?"±" + d.stddev_alignment.toFixed(3):""}</p>
        </div>
        `;
        rankContent.innerHTML += newCard;
    });
}



document.getElementById('parameter-select').addEventListener('change', function() {
    selectedParameter = this.value;
    createChart(selectedParameter, selectedDatatype);
}
);
document.querySelectorAll('input[name="datatype"]').forEach(function(radio) {
    radio.addEventListener('change', function() {
        selectedDatatype = this.value;
        createChart(selectedParameter, selectedDatatype);
    });
});
