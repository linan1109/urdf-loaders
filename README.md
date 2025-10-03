# MRISA

**MRISA** stands for *Multi-Robot Interactive Simulation and Analysis* platform.

![](https://linan1109.github.io/projects/anymal.png)

MRISA provides a browser-based environment for visualizing and interacting with multiple robot simulations. You can try out the platform using our GitHub Page and sample data:

👉 [**Launch MRISA Online**](https://linan1109.github.io/MRISA/js)

**Demo Data**

To test the platform, you can use the following demo data files:
- [Demo Data 1](https://polybox.ethz.ch/index.php/s/jzQ74sZBg6naJXJ) 
- [Demo Data 2](https://polybox.ethz.ch/index.php/s/dds5KzUgOmimoDf) 
- [Demo Data 3](https://polybox.ethz.ch/index.php/s/RI8jhgs1tqHhGer) 
- [Demo Data 4](https://polybox.ethz.ch/index.php/s/BdIbPNGqgGXrXyH)

**Demo Video**

To see the video of the introduction and usage cases, you can visit:
- [Video with subtitles](https://drive.google.com/file/d/15I4hIdpsVYZbwlWjA39Z_J687PKG5mDj/view?usp=sharing )
- [Video without subtitles](https://drive.google.com/file/d/1AnwBuILhjV-IuuQDZdxLqI0nYAu0vZDO/view?usp=drive_link )

## Installation

If you'd like to install and run MRISA locally (recommended for faster loading and custom robot support), follow these steps:

```bash
git clone https://github.com/linan1109/MRISA.git
cd MRISA/javascript/
npm install
npm run start
```

Then, open your browser and go to:
http://localhost:9080/dev-bundle/index.html (or change the port as shown in your terminal).

## Acknowledgement
This project is built based on [urdf-loaders](https://github.com/gkjohnson/urdf-loaders). And the URDF model of ANYmal is from RaiSim's [anymal](https://github.com/raisimTech/raisimLib/tree/master/rsc/anymal).

We gratefully acknowledge the authors and contributors of these open-source projects.

## LICENSE

The software is available under the [Apache V2.0 license](./LICENSE).

Copyright © 2020 California Institute of Technology. ALL RIGHTS
RESERVED. United States Government Sponsorship Acknowledged.
Neither the name of Caltech nor its operating division, the
Jet Propulsion Laboratory, nor the names of its contributors may be
used to endorse or promote products derived from this software
without specific prior written permission.
