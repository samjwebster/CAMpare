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

                    config_level_data.push({
                        model: model_name,
                        alignment: average_alignment,
                        stats: stats
                    });
                }

                // Sample level: one object per sample, where alignment ratio varies but stats are the same
                for (let i = 0; i < alignment_data.length; i++) {
                    let model_name = Object.keys(data)[i];
                    let alignment = alignment_data[i];
                    let stats = stats_data[i];

                    for (let sample in alignment) {
                        sample_level_data.push({
                            model: model_name,
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
        .attr('width', 450)
        .attr('height', 450);

    let margin = { top: 40, right: 0, bottom: 20, left: 50 };
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
        .text('Alignment Ratio');

    // Title
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', margin.top / 2)
        .attr('text-anchor', 'middle')
        .style('font-size', '15px')
        .style('font-weight', 'bold')
        .text(`Parameter vs Alignment Ratio: ${parameter_label}`);

    // Draw error bars
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
                .html(`Model: ${d.model}<br>Sample: ${d.sample || 'N/A'}<br>${parameter} (mean): ${d.stats[parameter][0]}<br>Alignment: ${d.alignment}`);
        })
        .on('mouseout', function() {
            d3.select(this).style('fill', 'steelblue');
            d3.select('#tooltip').style('display', 'none');
        });

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
