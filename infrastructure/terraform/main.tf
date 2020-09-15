provider "aws" {
  version = "~> 2.0"
  region = "eu-west-1"
}

resource "aws_s3_bucket" "analytics_bucket_test" {
  bucket = "odh.analytics-test"
  acl    = "public-read"
  policy = file("test/policy.json")

  website {
    index_document = "index.html"
  }
}

resource "aws_s3_bucket" "analytics_bucket_prod" {
  bucket = "odh.analytics-prod"
  acl    = "public-read"
  policy = file("prod/policy.json")

  website {
    index_document = "index.html"
  }
}
