-- schema.sql 파일 하단에 추가
DROP TABLE IF EXISTS comments;

CREATE TABLE comments (
                          id BIGINT AUTO_INCREMENT PRIMARY KEY,
                          content VARCHAR(255),
                          user_id BIGINT
);