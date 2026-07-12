.PHONY: help install data eda report test lint format clean

help:
	@echo "Available targets:"
	@echo "  install  Install Python dependencies"
	@echo "  data     Clean raw data -> data/processed/brent_clean.csv"
	@echo "  eda      Execute the EDA notebook in place"
	@echo "  report   Build reports/interim_report.html"
	@echo "  test     Run the test suite"
	@echo "  lint     Check formatting with black and isort"
	@echo "  format   Apply black and isort"
	@echo "  clean    Remove caches and generated artifacts"

install:
	pip install -r requirements.txt

data:
	python -m src.data_loader

eda:
	jupyter nbconvert --to notebook --execute --inplace notebooks/01_eda.ipynb

report:
	python scripts/build_report.py

test:
	pytest

lint:
	black --check src scripts tests
	isort --check-only src scripts tests

format:
	black src scripts tests
	isort src scripts tests

clean:
	rm -rf .pytest_cache .mypy_cache **/__pycache__
	rm -f data/processed/brent_clean.csv
