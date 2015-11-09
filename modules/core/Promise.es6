"use strict";

class Promise {
	constructor(resolver) {
		this.status = Promise.Status.READY;
		this.result = null;
		this.callbacks = [];
		this.percentage = 0.0;

		if (! resolver) {
			return;
		}

		try {
			resolver(
				this.resolve.bind(this),
				this.reject.bind(this),
				this.progress.bind(this));
		} catch (e) {
			this.reject(e.message);
		}
	}
	isComplete() {
		return this.status == Promise.Status.RESOLVED || this.status == Promise.Status.REJECTED;
	}
	resolve(value) {
		if (this.status == Promise.Status.READY) {
			this.result = value;
			this.progress(1.0);
			this.callbacks.
				filter(cb => cb.success).
				forEach(cb => cb.success(value));

			this.status = Promise.Status.RESOLVED;
		}
	}
	progress(percentage) {
		if (! isNaN(percentage) && this.status == Promise.Status.READY) {
			this.callbacks.
				filter(cb => cb.progress).
				forEach(cb => cb.progress(percentage));

			this.percentage = percentage;
		}
	}
	reject(reason) {
		if (this.status == Promise.Status.READY) {
			this.result = reason;
			this.callbacks.
				filter(cb => cb.failure).
				forEach(cb => cb.failure(reason));

			this.status = Promise.Status.REJECTED;
		}
	}
	then(successFn, failureFn, progressFn) {
		var next = new Promise(),
			callbacks = { };

		if (progressFn) {
			callbacks.progress = progressFn;
			progressFn(this.percentage);
		}
		if (failureFn) {
			callbacks.failure = function(value) {
				next.reject(failureFn(value));
			};
			if (this.status == Promise.Status.REJECTED) {
				callbacks.failure(this.result);
			}
		}
		if (successFn) {
			callbacks.success = function(value) {
				let result = successFn(value);
				if (result instanceof Promise) {
					result.then(
						value => next.resolve(value),
						reason => next.reject(reason));
				} else {
					next.resolve(result);
				}
			};
			if (this.status == Promise.Status.RESOLVED) {
				callbacks.success(this.result);
			}
		}

		this.callbacks.push(callbacks);
		return next;
	}
	wait(timeout) {
		var next = new Promise();
		this.then(value => {
			setTimeout(() => {
				next.resolve(value);
			}, timeout);
		});
		return next;
	}
}

Promise.Status = {
	READY: 'ready',
	RESOLVED: 'resolved',
	REJECTED: 'rejected'
};

Promise.on = function(eventBindingFn) {
	return new Promise(resolve => {
		eventBindingFn(null, () => { resolve(true); });
	});
};
Promise.resolve = function (value) {
	var promise = new Promise();
	promise.resolve(value);
	return promise;
};
Promise.reject = function (value) {
	var promise = new Promise();
	promise.reject(value);
	return promise;
};
Promise.wait = function(milliseconds) {
	var next = new Promise(),
		interval = null,
		since = new Date();

	setTimeout(() => {
		clearInterval(interval);
		next.resolve();
	}, milliseconds);

	interval = setInterval(() => {
		next.progress((new Date() - since) / milliseconds);
	}, 30);

	return next;
};
Promise.any = function(promiseList) {
	var next = new Promise();
	promiseList.forEach(promise => { promise.then(next); });
	if (promiseList.length === 0) {
		next.resolve(false);
	}
	return next;
};
Promise.all = function(promiseList) {
	var next = new Promise(),
		total = promiseList.length,
		args = [];

	if (promiseList.length === 0) {
		next.resolve([]);
	} else {
		promiseList.forEach((promise, i) => {
			promise.then(value => { // on success
				args[i] = value;
				if (-- total === 0) {
					next.resolve(args);
				}
			}, undefined, () => {
				var numerator = promiseList.reduce((prev, current) => {
					return prev.percentage + current.percentage;
				}), denominator = promiseList.length;
				next.progress(numerator / denominator);
			});
		});
	}

	return next;
};

export { Promise };

