let alignmentCardContainer;
let selectedModel = null;
let selectedBaseline = null;

window.addEventListener('load', function() {
    console.log("Window loaded");

    alignmentCardContainer = document.getElementById('alignment-card-container');
    renderAlignmentCards(null, null); // Render empty state initially

    // Populate the model dropdowns with models from "models/models.json"
    fetch('models/models.json')
        .then(response => response.json())
        .then(models => {
            // console.log(models)
            let modelDropdowns = document.querySelectorAll('.model-dropdown');
            modelDropdowns.forEach(dropdown => {
                // Models is a {<key>: <model info>, ...} object
                for (const [key, model] of Object.entries(models)) {
                    let option = document.createElement('option');
                    option.value = key; // Use the key as the value
                    option.textContent = model.nickname ? model.nickname : model.name;
                    dropdown.appendChild(option);
                }
            });
        })
        .catch(error => console.error('Error loading models:', error));
});

function emptyContainer() {
    if (alignmentCardContainer) {
        alignmentCardContainer.innerHTML = '';
    }
}

function createAlignmentCard(original_path, cam_path, ig_path, alignment_score, index) {
    const card = document.createElement('div');
    card.className = 'card';

    card.innerHTML = `
        <div class="card" style="background-color: #f9f9f9; border-radius: 10px; padding: 20px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); display: flex; flex-direction: column; align-items: center; gap: 0px;">
            <div style="text-align: center;">
                <h5>Image ${index + 1}<br>Alignment: ${alignment_score}%</h5>
            </div>
            <div class="card-body" style="display: flex; flex-direction: row; align-items: center; gap: 10px;">
                <div style="display: flex; flex-direction: column; align-items: center;">
                    <img src="${original_path}" class="img-fluid" style="width: 15vw; height: 15vw;">
                    <p>Input</p>
                </div>
                <div style="display: flex; flex-direction: column; align-items: center;">
                    <img src="${ig_path}" class="img-fluid" style="width: 15vw; height: 15vw;">
                    <p>IG</p>
                </div>
                <div style="display: flex; flex-direction: column; align-items: center;">
                    <img src="${cam_path}" class="img-fluid" style="width: 15vw; height: 15vw;">
                    <p>CAM</p>
                </div>

            </div>
        </div>
    `;

    alignmentCardContainer.appendChild(card);
}

function createBaselineCard(original_path, cam_path, ig_path, baseline_cam_path, baseline_ig_path, alignment_score, index) {
    const card = document.createElement('div');
    card.className = 'card';

    const container = document.createElement('div');
    container.className = 'card';
    container.style.backgroundColor = '#f9f9f9';
    container.style.borderRadius = '10px';
    container.style.padding = '20px';
    container.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.alignItems = 'center';
    container.style.gap = '10px';

    const title = document.createElement('div');
    title.style.textAlign = 'center';
    title.innerHTML = `<h5>Image ${index + 1}<br>Alignment: ${alignment_score}%</h5>`;
    container.appendChild(title);

    const body = document.createElement('div');
    body.style.display = 'flex';
    body.style.flexDirection = 'row';
    body.style.alignItems = 'center';
    body.style.gap = '20px';

    function createImageBlock(imgPath, label) {
        const block = document.createElement('div');
        block.style.display = 'flex';
        block.style.flexDirection = 'column';
        block.style.alignItems = 'center';

        const img = document.createElement('img');
        img.src = imgPath;
        img.className = 'img-fluid';
        img.style.width = '15vw';
        img.style.height = '15vw';

        const p = document.createElement('p');
        p.innerText = label;

        block.appendChild(img);
        block.appendChild(p);
        return block;
    }

    function createCanvasBlock(label) {
        const block = document.createElement('div');
        block.style.display = 'flex';
        block.style.flexDirection = 'column';
        block.style.alignItems = 'center';

        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 200;
        canvas.style.width = '15vw';
        canvas.style.height = '15vw';

        const p = document.createElement('p');
        p.innerText = label;

        block.appendChild(canvas);
        block.appendChild(p);
        return { block, canvas };
    }

    body.appendChild(createImageBlock(original_path, 'Input'));

    const { block: igDiffBlock, canvas: igCanvas } = createCanvasBlock('IG Diff');
    body.appendChild(igDiffBlock);

    const { block: camDiffBlock, canvas: camCanvas } = createCanvasBlock('CAM Diff');
    body.appendChild(camDiffBlock);

    container.appendChild(body);
    card.appendChild(container);
    alignmentCardContainer.appendChild(card);

    function loadAndColorDiff(imgPath1, imgPath2, canvas) {
        const ctx = canvas.getContext('2d');
        const img1 = new Image();
        const img2 = new Image();
        let loaded = 0;

        function toGrayscale(r, g, b) {
            return 0.299 * r + 0.587 * g + 0.114 * b;
        }

        function tryDraw() {
            if (loaded < 2) return;

            const tempCanvas1 = document.createElement('canvas');
            const tempCanvas2 = document.createElement('canvas');
            tempCanvas1.width = tempCanvas2.width = 200;
            tempCanvas1.height = tempCanvas2.height = 200;
            const tempCtx1 = tempCanvas1.getContext('2d');
            const tempCtx2 = tempCanvas2.getContext('2d');

            tempCtx1.drawImage(img1, 0, 0, 200, 200);
            tempCtx2.drawImage(img2, 0, 0, 200, 200);

            const imgData1 = tempCtx1.getImageData(0, 0, 200, 200);
            const imgData2 = tempCtx2.getImageData(0, 0, 200, 200);
            const output = ctx.createImageData(200, 200);

            for (let i = 0; i < imgData1.data.length; i += 4) {
                const grey1 = toGrayscale(imgData1.data[i], imgData1.data[i + 1], imgData1.data[i + 2]);
                const grey2 = toGrayscale(imgData2.data[i], imgData2.data[i + 1], imgData2.data[i + 2]);

                const diff = grey1 - grey2; // Model - Baseline

                if (diff >= 0) {
                    output.data[i] = 0;                    // R
                    output.data[i + 1] = Math.min(diff, 255); // G
                    output.data[i + 2] = 0;                  // B
                } else {
                    output.data[i] = Math.min(-diff, 255);  // R
                    output.data[i + 1] = 0;                  // G
                    output.data[i + 2] = 0;                  // B
                }
                output.data[i + 3] = 255; // Opaque
            }

            ctx.putImageData(output, 0, 0);
        }

        img1.onload = () => { loaded++; tryDraw(); };
        img2.onload = () => { loaded++; tryDraw(); };

        img1.src = imgPath1;
        img2.src = imgPath2;
    }

    loadAndColorDiff(ig_path, baseline_ig_path, igCanvas);
    loadAndColorDiff(cam_path, baseline_cam_path, camCanvas);
}



function createEmptyCard() {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
        <div class="card" style="background-color: #f9f9f9; border-radius: 10px; padding: 20px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); display: flex; flex-direction: column; align-items: center; gap: 0px;">
            Select a model from the "Main Model" dropdown above to get started.
        </div>
    `;
    alignmentCardContainer.appendChild(card);
}

function updateSelectedModelInfo(model) {
    const modelInfo = document.getElementById('selected-model-info');

    model_info_json = `models/${model}/config.json`;
    alignment_scores_json = `models/${model}/alignment_ratios.json`;
    stats_json = `models/${model}/stats.json`;

    if(!model) {
        modelInfo.innerHTML = `
            <h3>Selected Model: None</h3>
        `;
        return;
    }

    // Load all the JSONs simultaneously with d3
    Promise.all([
        fetch(model_info_json).then(response => response.json()),
        fetch(alignment_scores_json).then(response => response.json()),
        fetch(stats_json).then(response => response.json())
    ]).then(([modelData, alignmentScores, statsData]) => {
        avg_alignment = alignmentScores.reduce((acc, score) => acc + score, 0) / alignmentScores.length;

        modelInfo.innerHTML = `
            <h3>Selected Model: ${modelData.nickname ? modelData.nickname : modelData.name}</h3>
            <h4 style="padding: 0; margin: 0;">Configuration</h4>
            <p style="width: 100%; word-wrap: break-word;">
            <b>Model Directory Base</b>: ${modelData.parameters.model_directory_base || 'N/A'}<br>
            <b>Alpha</b>: ${modelData.parameters.alpha || 'N/A'}<br>
            <b>Saliency</b>: ${modelData.parameters.saliency || 'N/A'}<br>
            <b>Inverted</b>: ${modelData.parameters.inverted || 'N/A'}<br>
            <b>Mask</b>: ${modelData.parameters.mask || 'N/A'}<br>
            <b>Batch Size</b>: ${modelData.parameters.batch_size || 'N/A'}<br>
            <b>Number of Epochs</b>: ${modelData.parameters.num_epochs || 'N/A'}<br>
            <b>Architecture</b>: ${modelData.parameters.architecture || 'N/A'}</p>
            <h5 style="padding: 0; margin: 0;">Stats</h5>
            <p style="width: 100%; word-wrap: break-word;">
            <b>Average Alignment</b>: ${(avg_alignment*100).toFixed(2)}%<br>
            <b>AUC</b>: ${statsData.auc[0].toFixed(2)}±${statsData.auc[1].toFixed(2)}<br>
            <b>Accuracy</b>: ${statsData.accuracy[0].toFixed(2)}±${statsData.accuracy[1].toFixed(2)}<br>
            <b>Live Accuracy</b>: ${statsData.live_accuracy[0].toFixed(2)}±${statsData.live_accuracy[1].toFixed(2)}<br>
            <b>Spoof Accuracy</b>: ${statsData.spoof_accuracy[0].toFixed(2)}±${statsData.spoof_accuracy[1].toFixed(2)}<br>
            <b>d'</b>: ${statsData.dprime[0].toFixed(2)}±${statsData.dprime[1].toFixed(2)}<br>
            <b>FNR at FPR 1%</b>: ${statsData.fnr_at_fpr_1[0].toFixed(2)}±${statsData.fnr_at_fpr_1[1].toFixed(2)}</p>`;
    }).catch(error => console.error('Error loading model info:', error)); 
}

function renderAlignmentCards(model, baseline) {
    // Empty the container before adding new cards
    emptyContainer();

    updateSelectedModelInfo(model);

    if (!model) {
        createEmptyCard();
        return;
    }

    // Get the list of alignment scores
    alignment_scores_json = `models/${model}/alignment_ratios.json`;
    fetch(alignment_scores_json)
        .then(response => response.json())
        .then(alignmentScores => {
            // console.log("Alignment scores:", alignmentScores);
            // Update the alignment scores in the cards
            for (let i = 0; i < 16; i++) {
                let alignment_pct = (alignmentScores[i] * 100).toFixed(2);
                let originalPath = `models/${model}/original/original_${i}.png`;
                let camPath = `models/${model}/cams/avg_cam_${i}.png`;
                let igPath = `models/${model}/ig/avg_ig_${i}.png`;
                
                if(!baseline) createAlignmentCard(originalPath, camPath, igPath, alignment_pct, i);
                else {
                    let baselineCamPath = `models/${baseline}/cams/avg_cam_${i}.png`;
                    let baselineIgPath = `models/${baseline}/ig/avg_ig_${i}.png`;
                    createBaselineCard(originalPath, camPath, igPath, baselineCamPath, baselineIgPath, alignment_pct, i);
                }
            }
        })
        .catch(error => console.error('Error loading alignment scores:', error));
    
    
}



// Add event listener to the dropdown changing the main model
document.getElementById("model1-select").addEventListener("change", function() {
    console.log("Main Model selected:", this.value);

    // Update selectedModel and render the alignment cards
    selectedModel = this.value;
    renderAlignmentCards(selectedModel, selectedBaseline);
});

// Add event listener to the dropdown changing the baseline model
document.getElementById("model2-select").addEventListener("change", function() {
    console.log("Baseline Model selected:", this.value);

    // Update selectedModel and render the alignment cards
    selectedBaseline = this.value;
    renderAlignmentCards(selectedModel, selectedBaseline);
});

