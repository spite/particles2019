import { MeshSurfaceSampler } from "../third_party/MeshSurfaceSampler.js";
import { MeshBasicMaterial, Mesh, Vector3 } from "three";

export function randomPointsInGeometry(geometry, count) {
  const res = [];
  const surfaceMesh = new Mesh(geometry, new MeshBasicMaterial());
  const sampler = new MeshSurfaceSampler(surfaceMesh)
    .setWeightAttribute("color")
    .build();
  const position = new Vector3();

  for (let i = 0; i < count; i++) {
    sampler.sample(position);
    res.push(position.clone());
  }

  return res;
}
