"use strict";

import { Event }   from "./core/Event.es6";
import { DataSet } from "./core/DataSet.es6";
import { Promise } from "./core/Promise.es6";
import { CollectionView, CollectionViewFactory } from "./core/CollectionView.es6";

var Hadron = { Event, DataSet, Promise, CollectionView, CollectionViewFactory };

export { Event, DataSet, Promise, CollectionView, CollectionViewFactory };


global.Hadron = Hadron;

