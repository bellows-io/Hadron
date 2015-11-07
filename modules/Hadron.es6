"use strict";

import { Event }   from "./core/Event.es6";
import { DataSet } from "./core/DataSet.es6";
import { CollectionView, CollectionViewFactory } from "./core/CollectionView.es6";

var Hadron = { Event, DataSet, CollectionView, CollectionViewFactory };

export { Event, DataSet, CollectionView, CollectionViewFactory };


global.Hadron = Hadron;

