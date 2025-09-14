package com.example.hybrid.job;

import lombok.RequiredArgsConstructor;
import org.springframework.batch.core.partition.support.Partitioner;
import org.springframework.batch.item.ExecutionContext;
import org.springframework.jdbc.core.JdbcTemplate;

import javax.sql.DataSource;
import java.util.HashMap;
import java.util.Map;

@RequiredArgsConstructor
public class IdRangePartitioner implements Partitioner {

    private final DataSource dataSource;

    @Override
    public Map<String, ExecutionContext> partition(int gridSize) {
        // (1) DB에서 최소 ID와 최대 ID를 조회합니다.
        JdbcTemplate jdbcTemplate = new JdbcTemplate(dataSource);
        Long minId = jdbcTemplate.queryForObject("SELECT MIN(id) FROM users", Long.class);
        Long maxId = jdbcTemplate.queryForObject("SELECT MAX(id) FROM users", Long.class);

        // (2) 전체 데이터 수를 기준으로 각 파티션이 처리할 범위를 계산합니다.
        long targetSize = (maxId - minId + 1) / gridSize + 1;

        Map<String, ExecutionContext> result = new HashMap<>();
        long number = 0;
        long start = minId;
        long end = start + targetSize - 1;

        // (3) gridSize만큼 루프를 돌며 각 파티션의 ExecutionContext를 생성합니다.
        while (start <= maxId) {
            ExecutionContext context = new ExecutionContext();
            result.put("partition" + number, context);

            if (end >= maxId) {
                end = maxId;
            }

            // (4) 각 파티션이 사용할 minId, maxId를 ExecutionContext에 저장합니다.
            // 이 값들은 Worker Step에서 @StepScope로 주입받아 사용됩니다.
            context.putLong("minId", start);
            context.putLong("maxId", end);

            start += targetSize;
            end += targetSize;
            number++;
        }

        return result;
    }
}
